// @ts-check
// js/haptics.js
// Capacitor Haptics wrapper with fallback to Web Vibration API

/**
 * @typedef {import('@capacitor/haptics').HapticsPlugin} HapticsPlugin
 * @typedef {typeof import('@capacitor/haptics').ImpactStyle} ImpactStyleType
 * @typedef {typeof import('@capacitor/haptics').NotificationType} NotificationTypeType
 */

/** @type {HapticsPlugin | null} */
let _Haptics = null;
/** @type {ImpactStyleType | null} */
let _ImpactStyle = null;
/** @type {NotificationTypeType | null} */
let _NotificationStyle = null;

// Single stored promise - subsequent calls reuse the same one
const _ready = import('@capacitor/haptics')
    .then((mod) => {
        _Haptics = mod.Haptics;
        _ImpactStyle = mod.ImpactStyle;
        _NotificationStyle = mod.NotificationType;
    })
    .catch(() => {
        // Not in Capacitor or haptics not available - fall back to navigator.vibrate
    });

/**
 * Triggers a brief vibration via the Web Vibration API as a fallback.
 * @param {number} ms - Duration of the vibration in milliseconds
 * @returns {void}
 */
function vibrateFallback(ms) {
    if (navigator.vibrate) navigator.vibrate(ms);
}

/** Light tap - for toggles, menu opens
 * @async
 * @returns {Promise<void>}
 */
export async function hapticLight() {
    await _ready;
    try {
        if (_Haptics) {
            await _Haptics.impact({ style: _ImpactStyle.Light });
            return;
        }
    } catch {}
    vibrateFallback(30);
}

/** Medium impact - for play/pause, skip
 * @async
 * @returns {Promise<void>}
 */
export async function hapticMedium() {
    await _ready;
    try {
        if (_Haptics) {
            await _Haptics.impact({ style: _ImpactStyle.Medium });
            return;
        }
    } catch {}
    vibrateFallback(50);
}

/** Success notification - for like/unlike, add to queue
 * @async
 * @returns {Promise<void>}
 */
export async function hapticSuccess() {
    await _ready;
    try {
        if (_Haptics) {
            await _Haptics.notification({ type: _NotificationStyle.Success });
            return;
        }
    } catch {}
    vibrateFallback(40);
}

/** Long press - replaces navigator.vibrate(50) for track selection
 * @async
 * @returns {Promise<void>}
 */
export async function hapticLongPress() {
    await _ready;
    try {
        if (_Haptics) {
            await _Haptics.impact({ style: _ImpactStyle.Medium });
            return;
        }
    } catch {}
    vibrateFallback(50);
}
