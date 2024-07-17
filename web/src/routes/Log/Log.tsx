import { useEffect } from 'react';
import { useLogContext } from '../../internal/log';

import LineReaderComponent from '../../components/LineReader/LineReader'

import './Log.css'

export default function LogView() {
    const log = useLogContext();

    useEffect(() => {
        return () => {
            if (location.pathname != '/log') { // <-- For "StrictMode"
                log.dispatch({ type: 'silence' })
            }
        }
    }, [])

    return (
        <div className='zenin__log'>
            {log.state.lines.length > 0
                ? <LineReaderComponent lines={log.state.lines} urgent={log.state.urgent} />
                : <div className='zenin__log_placeholder' />}
        </div>
    )
}
