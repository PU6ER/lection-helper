// Background service worker for the Lecture Helper extension
// This runs persistently and monitors tabs for the lecture site

let isMonitoring = false
let monitoredTabId = null

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	// Check if the tab is loading the lecture site
	if (
		tab.url &&
		tab.url.includes('my.mts-link.ru') &&
		changeInfo.status === 'complete'
	) {
		console.log('Lecture site detected:', tab.url)

		// Inject content script if not already injected
		chrome.scripting
			.executeScript({
				target: { tabId: tabId },
				files: ['content.js'],
			})
			.catch(err => {
				// Script might already be injected, ignore error
				console.log('Content script injection result:', err.message)
			})

		// Start monitoring this tab
		monitoredTabId = tabId
		isMonitoring = true

		// Set up periodic checking for attendance button
		startPeriodicCheck(tabId)
	}
})

// Periodic check for attendance button
function startPeriodicCheck(tabId) {
	const interval = setInterval(() => {
		// Check if tab still exists and is the monitored tab
		chrome.tabs.get(tabId, tab => {
			if (
				chrome.runtime.lastError ||
				!tab ||
				!tab.url.includes('my.mts-link.ru')
			) {
				clearInterval(interval)
				isMonitoring = false
				monitoredTabId = null
				return
			}

			// Send message to content script to check for attendance button
			chrome.tabs
				.sendMessage(tabId, { action: 'checkAttendanceButton' })
				.catch(err => {
					// Content script might not be ready yet
					console.log('Message send error:', err.message)
				})
		})
	}, 2000) // Check every 2 seconds
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.action === 'attendanceButtonFound') {
		console.log('Attendance button found and clicked!')

		// Optional: Show notification
		chrome.notifications.create({
			type: 'basic',
			iconUrl: 'icons/icon48.png',
			title: 'Lecture Helper',
			message: 'Attendance button clicked automatically!',
		})
	}

	if (message.action === 'modalClosed') {
		console.log('Modal closed automatically after attendance confirmation')

		// Optional: Show notification
		chrome.notifications.create({
			type: 'basic',
			iconUrl: 'icons/icon48.png',
			title: 'Lecture Helper',
			message: 'Modal closed automatically!',
		})
	}

	if (message.action === 'getStatus') {
		sendResponse({
			isMonitoring: isMonitoring,
			monitoredTabId: monitoredTabId,
		})
	}
})

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
	console.log('Lecture Helper extension started')
})

chrome.runtime.onInstalled.addListener(() => {
	console.log('Lecture Helper extension installed')
})
