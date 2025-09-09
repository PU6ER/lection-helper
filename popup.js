// Popup script for the Lecture Helper extension

document.addEventListener('DOMContentLoaded', function () {
	const statusElement = document.getElementById('status')
	const statusTextElement = document.getElementById('statusText')
	const testButton = document.getElementById('testButton')
	const refreshButton = document.getElementById('refreshButton')

	// Update status display
	function updateStatus() {
		chrome.runtime.sendMessage({ action: 'getStatus' }, response => {
			if (response && response.isMonitoring) {
				statusElement.className = 'status active'
				statusTextElement.textContent = 'Monitoring Active'
			} else {
				statusElement.className = 'status inactive'
				statusTextElement.textContent = 'Not Monitoring'
			}
		})

		// Check if we're on the lecture site
		chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
			if (tabs[0] && tabs[0].url && tabs[0].url.includes('my.mts-link.ru')) {
				statusTextElement.textContent += ' (On Lecture Site)'
				testButton.disabled = false
			} else {
				if (statusTextElement.textContent === 'Not Monitoring') {
					statusTextElement.textContent = 'Not on Lecture Site'
				}
				testButton.disabled = true
			}
		})
	}

	// Test button functionality
	testButton.addEventListener('click', function () {
		chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
			if (tabs[0] && tabs[0].url && tabs[0].url.includes('my.mts-link.ru')) {
				chrome.tabs.sendMessage(tabs[0].id, { action: 'checkAttendanceButton' })
				statusTextElement.textContent = 'Testing...'

				setTimeout(() => {
					updateStatus()
				}, 2000)
			}
		})
	})

	// Refresh button functionality
	refreshButton.addEventListener('click', function () {
		updateStatus()
	})

	// Initial status update
	updateStatus()

	// Update status every 5 seconds
	setInterval(updateStatus, 5000)
})
