import React, { useEffect, type JSX, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import onElementRemoved from './onElementRemoved';
import { createPortal } from 'react-dom';

/**
 * Renders a ReactNode into a given DOM node, returning the root and node.  If the node is removed from the
 * document, the root will be automatically unmounted.
 * @param node - The DOM node to render into.
 * @param reactNode - The ReactNode to render.
 * @returns
 */
export async function renderToNode<T extends Element | DocumentFragment = HTMLElement>(
    node: T,
    reactNode: ReactNode | JSX.Element
): Promise<{ node: T; root: Root }> {
    const root = createRoot(node);
    root.render((<>{reactNode}</>) as ReactNode);

    if (!(node instanceof DocumentFragment)) {
        onElementRemoved(node, () => {
            root.unmount();
        });
    }

    return { node, root };
}

function CallbackRenderer({ callback, children }: React.PropsWithChildren<{ callback: () => any }>) {
    useEffect(callback, [null]);

    return <>{children}</>;
}

/**
 * Renders the component to a {@link DocumentFragment} and returns it.  Only useful for static components.
 * @param component
 * @returns
 */
export function renderToFragment<
    T extends Element | DocumentFragment = DocumentFragment,
    Rt = { root: Root; node: NonNullable<T> },
>(component: ReactNode | JSX.Element, fragment?: T): Promise<Rt> {
    return new Promise((resolve, reject) => {
        fragment = fragment || (document.createDocumentFragment() as T);

        Promise.resolve()
            .then(async () => {
                const { root, node } = await renderToNode(
                    document.createDocumentFragment(),
                    createPortal(
                        (
                            <CallbackRenderer
                                callback={() => {
                                    const output = { root, node: fragment };

                                    resolve(output as Rt);
                                }}
                            >
                                {component as ReactNode}
                            </CallbackRenderer>
                        ) as ReactNode,
                        fragment as DocumentFragment
                    )
                );

                return { root, node };
            })
            .catch(reject);
    });
}

/**
 * Appends a React portal rendering the provided component into the given DOM container.
 *
 * Renders the supplied ReactNode as a portal into `container`. If `container` is null, the function is a no-op.
 * The function awaits the internal render step; once rendered, it attaches a removal listener that will
 * unmount the rendered root automatically when the container element is removed from the document.
 *
 * @param component - The ReactNode to render inside the portal.
 * @param container - The target HTMLElement to host the portal. If null, nothing is rendered.
 * @returns A Promise that resolves when the portal has been rendered (or immediately if `container` is null).
 *
 * @remarks
 * - Callers can await this function to ensure the portal has been mounted.
 * - Cleanup is automatic: when the container element is removed, the mounted root is unmounted.
 *
 * @example
 * await appendPortal(<MyModal />, document.body);
 */
export async function appendPortal(component: ReactNode | JSX.Element, container: HTMLElement | null) {
    if (!container) {
        return;
    }

    const { root, node } = await renderToFragment(createPortal((<>{component}</>) as ReactNode, container));

    onElementRemoved(container, () => {
        root.unmount();
    });
}
