/**
 * Runs a callback when a given DOM element (or any of its ancestors up to <body>) is removed from the document.
 *
 * @param element - The DOM element to watch for removal
 * @param callback - The function to run once the element is removed
 * @returns A cleanup function to stop observing
 */

export default function onElementRemoved(element: Element, callback: () => void): () => void {
    if (!element.isConnected) {
        callback();
        return () => {};
    }

    // Find the top-most ancestor we’ll observe
    const root = element.ownerDocument?.body ?? document.body;

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const removedNode of Array.from(mutation.removedNodes)) {
                if (removedNode === element || (removedNode instanceof Element && removedNode.contains(element))) {
                    callback();
                    observer.disconnect();
                    return;
                }
            }
        }
    });

    observer.observe(root, { childList: true, subtree: true });

    return () => observer.disconnect();
}
