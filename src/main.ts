import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { applyTheme, getInitialTheme } from './app/core/utils/theme.utils';

applyTheme(getInitialTheme());

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
