import AccountProvider from './internal/account/context.tsx';
import LayoutProvider from './internal/layout/context.tsx';
import MonitorProvider from './internal/monitor/context.tsx';
import SettingsProvider from './internal/settings/context.tsx';

import Initialize from './components/Router/Initialize.tsx';
import Provider from './components/Router/Provider.tsx';
import Router from "./components/Router/Router.tsx";

import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import './css/cover.css';
import './css/dialog.css';
import './css/helper.css';
import './css/icon.css';
import './css/input.css';
import './css/menu.css';
import './css/root.css';
import './css/scrollbar.css';
import './css/spinner.css';
import './css/state.css';
import './css/widget.css';

const providers = [
    MonitorProvider,
    LayoutProvider,
    AccountProvider,
    SettingsProvider
];

ReactDOM.createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <Provider providers={providers}>
                <Initialize>
                    <Router />
                </Initialize>
            </Provider>
        </BrowserRouter>
    </StrictMode>
)