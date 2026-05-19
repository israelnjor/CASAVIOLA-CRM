// js/session.js
// ─────────────────────────────────────────────
// CASAVIOLA CRM — SESSION MANAGER
// Handles inactivity timeout + warning toast
//
// Usage: import './session.js' on every page
// that requires authentication.
//
// Behaviour:
//   - 13 minutes inactivity → warning toast appears
//   - 15 minutes inactivity → auto sign out + redirect to login
//   - Any user activity resets the timer
// ─────────────────────────────────────────────

import { auth } from './firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const TIMEOUT_MS  = 15 * 60 * 1000; // 15 minutes
const WARNING_MS  = 13 * 60 * 1000; // warn at 13 minutes (2 min before logout)

let inactivityTimer = null;
let warningTimer    = null;
let warningToast    = null;
let isWarningShown  = false;

// ── Inject warning toast HTML + styles ──
function injectToast() {
  // Styles
  const style = document.createElement('style');
  style.textContent = `
    #cv-session-toast {
      position: fixed;
      bottom: 28px;
      right: 28px;
      z-index: 9999;
      background: #1f1f28;
      border: 1px solid rgba(245,158,11,0.4);
      border-radius: 14px;
      padding: 18px 20px;
      width: 320px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      display: flex;
      flex-direction: column;
      gap: 12px;
      animation: cvSlideIn 0.3s ease both;
      font-family: 'Outfit', sans-serif;
    }
    #cv-session-toast.hiding {
      animation: cvSlideOut 0.3s ease both;
    }
    .cv-toast-header {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .cv-toast-icon {
      font-size: 20px;
      flex-shrink: 0;
    }
    .cv-toast-title {
      font-size: 13.5px;
      font-weight: 600;
      color: #f59e0b;
    }
    .cv-toast-sub {
      font-size: 12.5px;
      color: #a09cb0;
      line-height: 1.5;
    }
    .cv-toast-countdown {
      font-family: 'Cormorant Garamond', serif;
      font-size: 28px;
      font-weight: 600;
      color: #f59e0b;
      text-align: center;
      letter-spacing: -1px;
    }
    .cv-toast-actions {
      display: flex;
      gap: 8px;
    }
    .cv-toast-btn {
      flex: 1;
      padding: 9px;
      border-radius: 8px;
      font-family: 'Outfit', sans-serif;
      font-size: 12.5px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: all 0.15s;
      text-align: center;
    }
    .cv-toast-btn.stay {
      background: linear-gradient(135deg, #7c5cbf, #9060d8);
      color: white;
    }
    .cv-toast-btn.stay:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(124,92,191,0.4); }
    .cv-toast-btn.logout {
      background: rgba(240,107,107,0.12);
      color: #f06b6b;
      border: 1px solid rgba(240,107,107,0.2);
    }
    .cv-toast-btn.logout:hover { background: rgba(240,107,107,0.2); }
    @keyframes cvSlideIn {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes cvSlideOut {
      from { opacity: 1; transform: translateY(0); }
      to   { opacity: 0; transform: translateY(16px); }
    }
  `;
  document.head.appendChild(style);

  // Toast element
  warningToast = document.createElement('div');
  warningToast.id = 'cv-session-toast';
  warningToast.style.display = 'none';
  warningToast.innerHTML = `
    <div class="cv-toast-header">
      <div class="cv-toast-icon">⏰</div>
      <div>
        <div class="cv-toast-title">Session expiring soon</div>
        <div class="cv-toast-sub">You'll be signed out due to inactivity in</div>
      </div>
    </div>
    <div class="cv-toast-countdown" id="cv-countdown">2:00</div>
    <div class="cv-toast-actions">
      <button class="cv-toast-btn stay" onclick="window.__cvStayLoggedIn()">Stay signed in</button>
      <button class="cv-toast-btn logout" onclick="window.__cvLogoutNow()">Sign out now</button>
    </div>
  `;
  document.body.appendChild(warningToast);
}

// ── Show warning toast with countdown ──
let countdownInterval = null;

function showWarning() {
  if (isWarningShown) return;
  isWarningShown = true;
  warningToast.style.display = 'block';

  let secondsLeft = 2 * 60; // 2 minutes

  function updateCountdown() {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    const el = document.getElementById('cv-countdown');
    if (el) el.textContent = `${m}:${s.toString().padStart(2,'0')}`;
    secondsLeft--;
    if (secondsLeft < 0) clearInterval(countdownInterval);
  }

  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 1000);
}

function hideWarning() {
  if (!warningToast || !isWarningShown) return;
  warningToast.classList.add('hiding');
  clearInterval(countdownInterval);
  setTimeout(() => {
    warningToast.style.display = 'none';
    warningToast.classList.remove('hiding');
    isWarningShown = false;
  }, 300);
}

// ── Reset timers on activity ──
function resetTimers() {
  // If warning is showing, hide it and reset
  if (isWarningShown) hideWarning();

  clearTimeout(inactivityTimer);
  clearTimeout(warningTimer);

  // Warn at 13 minutes
  warningTimer = setTimeout(showWarning, WARNING_MS);

  // Log out at 15 minutes
  inactivityTimer = setTimeout(handleTimeout, TIMEOUT_MS);
}

// ── Handle timeout — sign out ──
async function handleTimeout() {
  hideWarning();
  clearInterval(countdownInterval);

  try { await signOut(auth); } catch(_) {}

  // Show a brief message before redirect
  if (warningToast) {
    warningToast.innerHTML = `
      <div class="cv-toast-header">
        <div class="cv-toast-icon">🔒</div>
        <div>
          <div class="cv-toast-title">Session expired</div>
          <div class="cv-toast-sub">Redirecting to login...</div>
        </div>
      </div>`;
    warningToast.style.display = 'block';
    isWarningShown = true;
  }

  setTimeout(() => {
    window.location.href = getLoginPath();
  }, 1500);
}

// ── Stay logged in ──
window.__cvStayLoggedIn = () => {
  resetTimers();
};

// ── Log out now ──
window.__cvLogoutNow = async () => {
  clearTimeout(inactivityTimer);
  clearTimeout(warningTimer);
  clearInterval(countdownInterval);
  try { await signOut(auth); } catch(_) {}
  window.location.href = getLoginPath();
};

// ── Determine login path (works from /pages/ and root) ──
function getLoginPath() {
  const path = window.location.pathname;
  return path.includes('/pages/') ? '../index.html' : './index.html';
}

// ── Track user activity ──
const ACTIVITY_EVENTS = ['mousedown','mousemove','keydown','scroll','touchstart','click'];

function onActivity() {
  // Only reset if user is logged in
  if (auth.currentUser) resetTimers();
}

// ── Initialize ──
function init() {
  injectToast();

  // Listen for activity
  ACTIVITY_EVENTS.forEach(evt => {
    document.addEventListener(evt, onActivity, { passive: true });
  });

  // Start timers once auth is confirmed
  auth.onAuthStateChanged(user => {
    if (user) {
      resetTimers();
    } else {
      // Clear timers if logged out
      clearTimeout(inactivityTimer);
      clearTimeout(warningTimer);
      clearInterval(countdownInterval);
    }
  });
}

// Auto-initialize when imported
init();