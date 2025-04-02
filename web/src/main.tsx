import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import Initialize from './components/Initialize.tsx';
import Provider from './components/Provider.tsx';
import Router from "./components/Router.tsx";
import AccountProvider from './internal/account/context.tsx';
import LayoutProvider from './internal/layout/context.tsx';
import MonitorProvider from './internal/monitor/context.tsx';
import SettingsProvider from './internal/settings/context.tsx';

import './main.css';

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