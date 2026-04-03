import React from 'react';
import { type PropsWithChildren, useEffect, useState } from 'react';

export default function TestComponent({ children, text }: PropsWithChildren<{ text?: string }>) {
    const [state, setState] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setState((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ display: 'none' }}>
            <p>State: {state}</p>
            <p>Text: {text}</p>
            {children}
        </div>
    );
}
