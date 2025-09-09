// Content script that runs on my.mts-link.ru pages
// This script monitors for attendance/appearance buttons and clicks them automatically

console.log('Lecture Helper content script loaded')

// Configuration for button detection
const BUTTON_SELECTORS = [
	// Specific selector for my.mts-link.ru attendance button
	'button[data-testid="AttentionControlModal.action.submit.Button"]',
	'button.btn_success',
	// Common selectors for attendance/appearance buttons
	'button[aria-label*="attendance"]',
	'button[aria-label*="присутствие"]',
	'button[aria-label*="явка"]',
	'button:contains("Присутствую")',
	'button:contains("Я здесь")',
	'button:contains("Отметиться")',
	'button:contains("Present")',
	'button:contains("Here")',
	'button:contains("Attendance")',
	// Generic button selectors that might contain attendance functionality
	'.attendance-button',
	'.presence-button',
	'.check-in-button',
	'[data-testid*="attendance"]',
	'[data-testid*="Attention"]',
	'[data-testid*="presence"]',
	'[id*="attendance"]',
	'[id*="presence"]',
	'[class*="attendance"]',
	'[class*="presence"]',
]

// Text patterns to look for in buttons
const BUTTON_TEXT_PATTERNS = [
	/подтверждаю/i,
	/присутствую/i,
	/я здесь/i,
	/отметиться/i,
	/явка/i,
	/attendance/i,
	/present/i,
	/here/i,
	/check.?in/i,
	/confirm/i,
]

// Text patterns to exclude (cancel buttons)
const EXCLUDE_TEXT_PATTERNS = [/закрыть/i, /отмена/i, /cancel/i, /close/i]

let isButtonFound = false
let observer = null

// Function to check if a button matches our criteria
function isAttendanceButton(button) {
	if (!button || button.tagName !== 'BUTTON') return false

	// Exclude cancel/close buttons explicitly
	const dataTestId = button.getAttribute('data-testid') || ''
	if (dataTestId.includes('cancel') || dataTestId.includes('close')) {
		return false
	}

	const buttonText = button.textContent.trim().toLowerCase()
	const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase()
	const title = (button.getAttribute('title') || '').toLowerCase()
	const id = (button.getAttribute('id') || '').toLowerCase()
	const className = (button.getAttribute('class') || '').toLowerCase()

	const allText = `${buttonText} ${ariaLabel} ${title} ${id} ${className}`

	// Check exclusion patterns first
	for (const pattern of EXCLUDE_TEXT_PATTERNS) {
		if (pattern.test(allText)) {
			return false
		}
	}

	// Check against text patterns for attendance/submit buttons only
	for (const pattern of BUTTON_TEXT_PATTERNS) {
		if (pattern.test(allText)) {
			return true
		}
	}

	return false
}

// Function to find attendance button
function findAttendanceButton() {
	// First try the specific my.mts-link.ru selector
	let button = document.querySelector(
		'button[data-testid="AttentionControlModal.action.submit.Button"]'
	)
	if (
		button &&
		button.style.display !== 'none' &&
		button.offsetParent !== null
	) {
		return button
	}

	// Try to find button with "Подтверждаю" text specifically (not "Закрыть")
	const modalButtons = document.querySelectorAll(
		'.ModalActions__root___XQgTE button'
	)
	for (const btn of modalButtons) {
		if (
			btn.textContent.includes('Подтверждаю') &&
			!btn.textContent.includes('Закрыть') &&
			btn.style.display !== 'none' &&
			btn.offsetParent !== null
		) {
			return btn
		}
	}

	// Then try other specific selectors
	for (const selector of BUTTON_SELECTORS) {
		try {
			const buttons = document.querySelectorAll(selector)
			for (const button of buttons) {
				if (button.style.display !== 'none' && button.offsetParent !== null) {
					return button
				}
			}
		} catch (e) {
			// Selector might not be valid, continue
			continue
		}
	}

	// Then check all buttons on the page
	const allButtons = document.querySelectorAll('button')
	for (const button of allButtons) {
		if (
			isAttendanceButton(button) &&
			button.style.display !== 'none' &&
			button.offsetParent !== null
		) {
			return button
		}
	}

	return null
}

// Function to find cancel button to close the modal
function findCancelButton() {
	// Look for the specific cancel button
	let cancelButton = document.querySelector(
		'button[data-testid="AttentionControlSuccessModal.action.cancel"]'
	)
	if (
		cancelButton &&
		cancelButton.style.display !== 'none' &&
		cancelButton.offsetParent !== null
	) {
		return cancelButton
	}

	// Alternative selectors for cancel button
	const cancelSelectors = [
		'.AttentionControlSuccessModal__cancel___KGPVE',
		'button.btn-link_success:contains("Закрыть")',
		'.ModalActions__root___XQgTE button:contains("Закрыть")',
	]

	for (const selector of cancelSelectors) {
		try {
			const buttons = document.querySelectorAll(selector)
			for (const button of buttons) {
				if (
					button.textContent.includes('Закрыть') &&
					button.style.display !== 'none' &&
					button.offsetParent !== null
				) {
					return button
				}
			}
		} catch (e) {
			continue
		}
	}

	// Look for any button with "Закрыть" text in modal area
	const allButtons = document.querySelectorAll(
		'.ModalActions__root___XQgTE button, .btn-link button'
	)
	for (const button of allButtons) {
		if (
			button.textContent.includes('Закрыть') &&
			button.style.display !== 'none' &&
			button.offsetParent !== null
		) {
			return button
		}
	}

	return null
}

// Function to click the cancel button to close modal
function clickCancelButton() {
	const cancelButton = findCancelButton()

	if (cancelButton) {
		console.log('Cancel button found, closing modal:', cancelButton)

		// Scroll button into view
		cancelButton.scrollIntoView({ behavior: 'smooth', block: 'center' })

		setTimeout(() => {
			try {
				cancelButton.focus()
				cancelButton.click()

				// Also try dispatching a click event
				const clickEvent = new MouseEvent('click', {
					bubbles: true,
					cancelable: true,
					view: window,
				})
				cancelButton.dispatchEvent(clickEvent)

				console.log('Modal closed successfully!')

				// Notify background script
				chrome.runtime.sendMessage({
					action: 'modalClosed',
					buttonText: 'Закрыть',
				})
			} catch (error) {
				console.error('Error clicking cancel button:', error)
			}
		}, 500)
	} else {
		console.log('Cancel button not found')
	}
}

// Function to click the attendance button
function clickAttendanceButton() {
	const button = findAttendanceButton()

	if (button && !isButtonFound) {
		console.log('Attendance button found:', button)
		isButtonFound = true

		// Scroll button into view
		button.scrollIntoView({ behavior: 'smooth', block: 'center' })

		// Wait a moment then click
		setTimeout(() => {
			try {
				// Try different click methods
				button.focus()
				button.click()

				// Also try dispatching a click event
				const clickEvent = new MouseEvent('click', {
					bubbles: true,
					cancelable: true,
					view: window,
				})
				button.dispatchEvent(clickEvent)

				console.log('Attendance button clicked successfully!')

				// Schedule cancel button click after 10 seconds
				setTimeout(() => {
					console.log('Attempting to close modal after 10 seconds...')
					clickCancelButton()
				}, 10000)

				// Notify background script
				chrome.runtime.sendMessage({
					action: 'attendanceButtonFound',
					buttonText: button.textContent.trim(),
				})

				// Reset flag after some time in case button appears again
				setTimeout(() => {
					isButtonFound = false
				}, 30000) // Reset after 30 seconds
			} catch (error) {
				console.error('Error clicking attendance button:', error)
				isButtonFound = false
			}
		}, 1000)
	}
}

// Set up mutation observer to watch for dynamically added buttons
function setupMutationObserver() {
	if (observer) {
		observer.disconnect()
	}

	observer = new MutationObserver(mutations => {
		let shouldCheck = false

		mutations.forEach(mutation => {
			if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
				// Check if any added nodes contain buttons or modals
				for (const node of mutation.addedNodes) {
					if (node.nodeType === Node.ELEMENT_NODE) {
						// Only check for attendance modal, not success modal
						if (
							node.querySelector(
								'[data-testid="AttentionControlModal.action.submit.Button"]'
							) ||
							(node.classList?.contains('ModalActions__root___XQgTE') &&
								node.querySelector('button') &&
								node.textContent.includes('Подтверждаю')) ||
							(node.tagName === 'BUTTON' &&
								node.getAttribute('data-testid') ===
									'AttentionControlModal.action.submit.Button')
						) {
							shouldCheck = true
							break
						}
					}
				}
			}
		})

		if (shouldCheck) {
			console.log('Modal or button detected, checking for attendance button...')
			setTimeout(clickAttendanceButton, 500)
		}
	})

	observer.observe(document.body, {
		childList: true,
		subtree: true,
	})
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.action === 'checkAttendanceButton') {
		clickAttendanceButton()
	}
})

// Initialize when page loads
function initialize() {
	console.log('Initializing Lecture Helper on:', window.location.href)

	// Initial check
	setTimeout(clickAttendanceButton, 2000)

	// Set up observer for dynamic content
	setupMutationObserver()

	// Periodic check as backup
	setInterval(clickAttendanceButton, 10000) // Check every 10 seconds
}

// Start when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initialize)
} else {
	initialize()
}
