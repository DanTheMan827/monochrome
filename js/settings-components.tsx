import React, { useEffect, type PropsWithChildren, type ReactNode } from 'react';
import { proxy, useSnapshot } from 'valtio';

export const settingVisibility = proxy({
    showHiResWarning: false,
    showLosslessContainer: false,
    showRememberLastFolder: false,
    showResetSavedFolder: false,
    showSingleDownloadsToFolder: false,
} satisfies Record<string, boolean>);

export function SettingsList({ active, id, children }: SettingsList.Props) {
    return (
        <div className={`settings-list ${active ? 'active' : ''}`} id={id}>
            {children}
        </div>
    );
}

export namespace SettingsList {
    export interface Props extends PropsWithChildren {
        active?: boolean;
        id?: string;
    }
}

export function SettingsGroup({ children }: React.PropsWithChildren) {
    return <div className="settings-group">{children}</div>;
}

export function SettingItem({ title, description, children, visibilityKey, onRender }: SettingItem.Props) {
    const visibility = visibilityKey ? useSnapshot(settingVisibility) : {};
    const display = visibility[visibilityKey] !== undefined ? { display: visibility[visibilityKey] ? '' : 'none' } : {};

    useEffect(() => {
        if (onRender) {
            return onRender();
        }
    }, []);

    return (
        <div
            className="setting-item"
            style={{
                ...display,
            }}
        >
            <div className="info">
                <span className="label">{title}</span>
                {description && <span className="description">{description}</span>}
            </div>
            {children}
        </div>
    ) as ReactNode;
}

export namespace SettingItem {
    export interface Props extends PropsWithChildren {
        title: string;
        description?: string;
        visibilityKey?: keyof typeof settingVisibility;
        onRender?: () => () => void | void;
    }
}

export function SettingToggle({
    value,
    onChange,
    className,
    title,
    description,
    visibilityKey,
    onRender,
}: SettingToggle.Props) {
    const [checked, setChecked] = React.useState(value);

    return (
        <SettingItem {...{ title, description, visibilityKey, onRender }}>
            <label className="toggle-switch">
                <input
                    type="checkbox"
                    className={className}
                    checked={checked}
                    onChange={async (e) => {
                        const newChecked = e.target.checked;
                        const result = await onChange(newChecked);
                        setChecked(result ?? newChecked);
                    }}
                />
                <span className="slider" />
            </label>
        </SettingItem>
    );
}

export namespace SettingToggle {
    export interface Props extends Omit<SettingItem.Props, 'children'> {
        value: boolean;
        className?: string;
        onChange: (value: boolean) => Promise<boolean | null> | (boolean | null);
    }
}

export function SettingInput({
    value,
    onChange,
    placeholder,
    style,
    className,
    title,
    description,
    visibilityKey,
    onRender,
}: SettingInput.Props) {
    const [text, setText] = React.useState(value);

    return (
        <SettingItem {...{ title, description, visibilityKey, onRender }}>
            <input
                type="text"
                className={className}
                style={style}
                placeholder={placeholder}
                value={text}
                onChange={async (e) => {
                    const newText = e.target.value;
                    const result = await onChange(newText);
                    setText(result ?? newText);
                }}
            />
        </SettingItem>
    );
}

export namespace SettingInput {
    export interface Props extends Omit<SettingItem.Props, 'children'> {
        value: string;
        placeholder?: string;
        style?: React.CSSProperties;
        className?: string;
        onChange: (value: string) => Promise<string | null> | (string | null);
    }
}

export function SettingButton({
    onClick,
    style,
    className = 'btn-secondary',
    label,
    title,
    description,
    visibilityKey,
    onRender,
}: SettingButton.Props) {
    return (
        <SettingItem {...{ title, description, visibilityKey, onRender }}>
            <button className={className} style={style} onClick={onClick}>
                {label}
            </button>
        </SettingItem>
    );
}

export namespace SettingButton {
    export interface Props extends Omit<SettingItem.Props, 'children'> {
        label: string;
        style?: React.CSSProperties;
        className?: string;
        onClick: () => void;
    }
}

export function SettingDropdown({
    value,
    onChange,
    style,
    className,
    children,
    title,
    description,
    visibilityKey,
    onRender,
}: SettingDropdown.Props) {
    const selectElement = React.useRef<HTMLSelectElement>(null);
    const [selected, setSelected] = React.useState(value);

    useEffect(() => {
        if (!selectElement.current) {
            return;
        }

        if (selectElement.current.value !== selected) {
            selectElement.current.value = selected;
        }
    }, [selectElement.current, selected]);

    return (
        <SettingItem {...{ title, description, visibilityKey, onRender }}>
            <select
                ref={selectElement}
                className={className}
                style={style}
                value={value}
                onChange={async (e) => {
                    const newValue = e.target.value;
                    const result = await onChange(newValue);
                    setSelected(result ?? newValue);
                }}
            >
                {children}
            </select>
        </SettingItem>
    );
}

export namespace SettingDropdown {
    export interface Props extends SettingItem.Props {
        value: string;
        onChange: (value: string) => Promise<string | null> | (string | null);
        style?: React.CSSProperties;
        className?: string;
    }
}
