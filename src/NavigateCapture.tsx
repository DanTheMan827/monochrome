import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setNavigateFunction } from './navigation';

export function NavigateCapture(): null {
    const navigate = useNavigate();
    useEffect(() => {
        setNavigateFunction(navigate);
    }, [navigate]);
    return null;
}
