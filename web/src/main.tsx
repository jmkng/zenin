import AccountProvider from './internal/account/context.tsx';
import LayoutProvider from './internal/layout/context.tsx';
import MetaProvider from './internal/meta/context.tsx';
import MonitorProvider from './internal/monitor/context.tsx';

import Initialize from './components/Initialize/Initialize.tsx';
import Provider from './components/Provider/Provider.tsx';
import Root from "./routes/Root.tsx";

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
import './css/state.css';
import './css/widget.css';

const providers = [
    MonitorProvider,
    LayoutProvider,
    AccountProvider,
    MetaProvider
];

ReactDOM.createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <Provider providers={providers}>
                <Initialize><Root /></Initialize>
            </Provider>
        </BrowserRouter>
    </StrictMode>
)
