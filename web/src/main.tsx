import LayoutProvider from './internal/layout/context.tsx';
import MonitorProvider from './internal/monitor/context.tsx';
import AccountProvider from './internal/account/context.tsx';
import LogProvider from './internal/log/context.tsx';

import RootComponent from "./routes/Root.tsx"
import Initialize from './components/Initialize/Initialize.tsx';
import Compose from './components/Compose/Compose.tsx';

import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { StrictMode } from 'react';

import './css/root.css'
import './css/helper.css'
import './css/scrollbar.css'
import './css/input.css';
import './css/icon.css';
import './css/widget.css';
import './css/state.css';

const providers = [
    MonitorProvider,
    LayoutProvider,
    AccountProvider,
    LogProvider
];

ReactDOM.createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <Compose providers={providers}>
                <Initialize>
                    <RootComponent />
                </Initialize>
            </Compose>
        </BrowserRouter>
    </StrictMode>
)
