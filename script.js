async function loadJSON(path){const r=await fetch(path);return r.json();}

function el(q,parent=document){return parent.querySelector(q)}
function createFromTemplate(template){return template.content.firstElementChild.cloneNode(true)}

async function main(){
  // use canonical data files only
  const locsPath = 'data/locations.json';
  const baitsPath = 'data/baits.json';
  // SPA now uses only locations, baits, and per-location species files under data/locations/
  const [locations,baits]=await Promise.all([loadJSON(locsPath), loadJSON(baitsPath)]);

  const locSel=el('#locationSelect');
  locations.forEach(loc=>{const o=document.createElement('option');o.value=loc.name;o.textContent=`${loc.name} (${loc.waterType})`;locSel.appendChild(o)});

  const typeSel=el('#typeSelect');
  const search=el('#search');

  const perLocationCache = {};
  function slugify(name){
    return name.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_\-]/g,'');
  }
  function tokensOf(s){
    if(!s) return [];
    const m = s.toString().toLowerCase().match(/\w+/g);
    return m || [];
  }
  async function getLocSpecies(locObj){
    if(!locObj) return [];
    const slug = locObj.slug || slugify(locObj.name);
    if(perLocationCache[slug]) return perLocationCache[slug];
    try{
      // load species from data/locations/{slug}.json
      let j = null;
      try{
        const r = await fetch(`data/locations/${slug}.json`);
        if(r && r.ok) j = await r.json();
      }catch(e){/* ignore */}
      if(j){
        let arr = [];
        if(Array.isArray(j)) arr = j;
        else if(j[locObj.name]) arr = j[locObj.name];
        else if(j[slug]) arr = j[slug];
        else {
          const vals = Object.values(j||{});
          if(vals.length>0 && Array.isArray(vals[0])) arr = vals[0];
          else if(vals.length>0 && typeof vals[0] === 'object') arr = vals;
        }
        const objs = (arr||[]).map(item => typeof item === 'string' ? {Species: item} : item);
        perLocationCache[slug] = objs;
        return objs;
      }
    }catch(e){/* ignore */}
    perLocationCache[slug] = [];
    return [];
  }

  async function matches(bait,locName,locObj){
    // bait must be appropriate for the location's water type OR be a location-specific bait
    const typeVal = (bait.type||'').toString();
    const typeMatch = (typeVal==='Universal' || typeVal==='any' || (locObj && (typeVal===locObj.waterType || typeVal===locObj.name)));
    if(!typeMatch) return false;
    // load species for this location
    const locSpeciesArr = await getLocSpecies(locObj);
    if(!locSpeciesArr || locSpeciesArr.length===0) return false; // no species -> bait not valid
    const targets = (bait.targets||[]).map(t=>t.toLowerCase());
    // find at least one species that matches target or group
    const matched = locSpeciesArr.filter(item=>{
      if(targets.length===0) return true;
      const nameTokens = tokensOf(item.Species || item.species);
      const groupTokens = tokensOf(item['Fish Group'] || item.fishGroup || item.group);
      const lifestyleTokens = tokensOf(item.Lifestyle || item.lifestyle);
      // require all tokens of a target to be present in a field (strict target match)
      return targets.some(t => {
        const tks = tokensOf(t);
        if(tks.length===0) return false;
        const matchField = (fieldTokens) => tks.every(tok => fieldTokens.includes(tok));
        return matchField(nameTokens) || matchField(groupTokens) || matchField(lifestyleTokens);
      });
    });
    return matched.length>0;
  }

  async function render(){
    const selLocName=locSel.value || locations[0].name;
    const locObj=locations.find(l=>l.name===selLocName)||locations[0];
    const typeFilter=typeSel.value;
    const q=search.value.trim().toLowerCase();
    const list=el('#baitList'); list.innerHTML='';
    for(const bait of baits){
      if(!(await matches(bait,selLocName,locObj))) continue;
      if(typeFilter!=='any' && bait.type!==typeFilter) continue;
      if(q && !(bait.name.toLowerCase().includes(q) || (bait.targets||[]).join(' ').toLowerCase().includes(q) || (bait.desc||'').toLowerCase().includes(q))) continue;

      const tpl=createFromTemplate(el('#baitTpl'));
      // render bait image (prefer `bait.image`, then `links[rel=image]`, then local resources/images/baits fallback)
      const iconEl = tpl.querySelector('.icon');
      const baitCandidates = [];
      if(bait.image) baitCandidates.push(bait.image);
      const baitLinks = bait.links || bait.Links || [];
      if(Array.isArray(baitLinks)){
        for(const ln of baitLinks){ if(ln && ln.rel==='image' && ln.href) baitCandidates.push(ln.href); }
      }
      // fallback to common local filename patterns based on bait name
      const baitSlug = (bait.name||'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
      baitCandidates.push(`resources/images/baits/${baitSlug}.png`);
      baitCandidates.push(`resources/images/baits/${baitSlug}.jpg`);
      baitCandidates.push(`resources/images/baits/${baitSlug}.webp`);
      const img = document.createElement('img');
      img.className = 'bait-img';
      img.alt = bait.name || 'bait';
      img.setAttribute('data-candidates', JSON.stringify(baitCandidates.filter(Boolean)));
      iconEl.innerHTML = '';
      iconEl.appendChild(img);
      tpl.querySelector('.name').textContent = bait.name;
      const tierEl = tpl.querySelector('.tier');
      const rawRarity = (bait.rarity||'').toString();
      tierEl.textContent = rawRarity;
      // add a normalized rarity class for styling
      const rarityClass = rawRarity.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9_\-]/g,'');
      tierEl.className = 'tier rarity-pill' + (rarityClass? ' rarity-'+rarityClass : '');
      const metaParts=[];
      if(bait.likelihood) metaParts.push(`Likelihood: ${bait.likelihood}%`);
      if(bait.sizeBonus) metaParts.push(`Size: +${bait.sizeBonus}%`);
      metaParts.push(`Type: ${bait.type}`);
      tpl.querySelector('.meta').textContent = metaParts.join(' • ');
      tpl.querySelector('.targets').textContent = `Targets: ${(bait.targets||[]).join(', ')}`;
      // make bait item keyboard-focusable and selectable
      tpl.tabIndex = 0;
      tpl.addEventListener('click', ()=>{
        document.querySelectorAll('.bait.selected').forEach(e=>e.classList.remove('selected'));
        tpl.classList.add('selected');
        showDetails(bait, selLocName);
      });
      tpl.addEventListener('keydown', (ev)=>{ if(ev.key==='Enter' || ev.key===' '){ ev.preventDefault(); tpl.click(); } });
      list.appendChild(tpl);
      // attempt to load bait image candidates for this item
      tryLoadSpeciesImages(tpl);
    }
  }

  async function showDetails(bait, locName){
    // render details in modal
    const locObj = locations.find(l=>l.name===locName) || locations[0];
    const locSpecies = await getLocSpecies(locObj);
    const targets = (bait.targets||[]).map(t=>t.toLowerCase());
    const matchedObjs = locSpecies.filter(item=>{
      if(targets.length===0) return true;
      const nameTokens = tokensOf(item.Species || item.species);
      const groupTokens = tokensOf(item['Fish Group'] || item.fishGroup || item.group);
      const lifestyleTokens = tokensOf(item.Lifestyle || item.lifestyle);
      return targets.some(t => {
        const tks = tokensOf(t);
        if(tks.length===0) return false;
        const matchField = (fieldTokens) => tks.every(tok => fieldTokens.includes(tok));
        return matchField(nameTokens) || matchField(groupTokens) || matchField(lifestyleTokens);
      });
    });
    // filter by bait type vs location waterType as well
    let final = matchedObjs;
    if(bait.type && bait.type!=='any' && bait.type!=='Universal'){
      if(locObj && locObj.waterType && bait.type !== locObj.waterType){
        final = []; // bait not suitable for this water type
      }
    }
    let html = '';
    if(final.length===0){ html = '<div class="muted">No matching species found for this bait in this location.</div>' }
    else{
      const parts = [];
      parts.push('<div class="species-list">');
      final.forEach(item=>{
        const name = item.Species || item.species || 'Unknown';
        const rarity = item.Rarity || item.rarity || 'Unknown';
        const group = item['Fish Group'] || item.fishGroup || item.group || '';
        const lifestyle = item.Lifestyle || item.lifestyle || '';
        const role = item['Ecosystem Role'] || item.ecosystemRole || '';
        const rawRarity = (rarity||'').toString();
        const rarityClass = rawRarity.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9_\-]/g,'');
        const raritySpanClass = 'rarity rarity-pill' + (rarityClass? ' rarity-'+rarityClass : '');
        // build image candidate list: prefer explicit HATEOAS `image` link or `image` field
        const candidates = [];
        // prefer explicit image field
        if(item.image){ candidates.push(item.image); }
        // prefer links with rel=image
        const links = item.links || item.Links || [];
        if(Array.isArray(links)){
          for(const ln of links){ if(ln && ln.rel==='image' && ln.href){ candidates.push(ln.href); } }
        }
        // fallback: try common filenames inside resources/images/{Species}/
        const dirName = (name||'').replace(/[\\/:*?"<>|]/g,'-');
        const slug = (name||'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
        const fallback = [
          `resources/images/${dirName}/fish_${slug}.png`,
          `resources/images/${dirName}/fish_${slug}.jpg`,
          `resources/images/${dirName}/${slug}.png`,
          `resources/images/${dirName}/${slug}.jpg`,
          `resources/images/${dirName}/${slug}.webp`,
          `resources/images/${dirName}/fish_${slug}.webp`
        ];
        for(const f of fallback) candidates.push(f);
        const candJson = JSON.stringify(candidates.filter(Boolean));
        parts.push(`<div class="species"><img data-candidates='${candJson}' class="species-img" alt="${name}"><div class="species-info"><div class="title">${name}<span class="${raritySpanClass}">${rarity}</span></div><div class="desc">${group}${group && lifestyle? ' • ': ''}${lifestyle}${(role? ' • '+role : '')}</div></div></div>`);
      });
      parts.push('</div>');
      html = parts.join('');
    }
    openModal(`Location: ${locName} — Bait: ${bait.name}`, html);
    // initialize species images (attempt candidate URLs sequentially)
    tryLoadSpeciesImages(modalBody);
  }

  function tryLoadSpeciesImages(root){
    if(!root) return;
    const imgs = root.querySelectorAll('img[data-candidates]');
    imgs.forEach(img=>{
      let list = [];
      try{ list = JSON.parse(img.getAttribute('data-candidates') || '[]'); }catch(e){ list = []; }
      if(!Array.isArray(list) || list.length===0) return;
      let idx = 0;
      const tryNext = ()=>{
        if(idx>=list.length){ img.style.display='none'; return; }
        img.src = list[idx];
        img.onerror = ()=>{ idx++; tryNext(); };
        img.onload = ()=>{ img.style.display='inline-block'; };
      };
      tryNext();
    });
  }

  locSel.addEventListener('change', render);
  typeSel.addEventListener('change', render);
  search.addEventListener('input', () => {render();});

  // modal helpers
  const modal = el('#modal');
  const modalTitle = el('#modalTitle');
  const modalBody = el('#modalBody');
  const modalClose = modal && modal.querySelector('.modal-close');
  function openModal(title, html){
    if(!modal) return;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden','false');
    modalTitle.textContent = title;
    modalBody.innerHTML = html;
    document.body.style.overflow = 'hidden';
    if(modalClose) modalClose.focus();
  }
  function closeModal(){
    if(!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden','true');
    modalBody.innerHTML = '';
    document.body.style.overflow = '';
  }
  if(modal){
    const overlay = modal.querySelector('.modal-overlay');
    if(overlay) overlay.addEventListener('click', closeModal);
    if(modalClose) modalClose.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeModal(); });
  }

  // set default and render
  locSel.selectedIndex = 0;
  render();
}

main().catch(e=>{console.error(e);alert('Failed to load data: '+e.message)})
