<script>
	import { createEventDispatcher } from 'svelte';
	import ModalReport from './ModalIncidentReport.svelte';
	import { page } from '$app/stores';
	import {
		IconFlag,
		IconFlagFilled,
		IconKeyFilled,
		IconClockPin,
		IconClockPause,
		IconClockPlay,
		IconClockStop,
		IconCircleCheckFilled,
		IconAlertTriangle
	} from '@tabler/icons-svelte';

	export let user;

	const dispatch = createEventDispatcher();
	let reportModalOpen = false;
	
	let locationData = null;
	let deviceInfo = null;
	let cameraStream = null;
	let isProcessing = false;

	function close() {
		dispatch('close');
	}

	function openReportModal(event) {
		event.stopPropagation();
		reportModalOpen = true;
	}

	function closeReportModal() {
		reportModalOpen = false;
	}

	// Get device information
	function getDeviceInfo() {
		const userAgent = navigator.userAgent;
		const platform = navigator.platform;
		
		// Parse browser info
		let browserName = 'Unknown';
		let browserVersion = 'Unknown';
		
		if (userAgent.indexOf('Chrome') > -1) {
			browserName = 'Google Chrome';
			const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
			browserVersion = match ? match[1] : 'Unknown';
		} else if (userAgent.indexOf('Firefox') > -1) {
			browserName = 'Mozilla Firefox';
			const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
			browserVersion = match ? match[1] : 'Unknown';
		} else if (userAgent.indexOf('Safari') > -1) {
			browserName = 'Safari';
			const match = userAgent.match(/Version\/(\d+\.\d+)/);
			browserVersion = match ? match[1] : 'Unknown';
		}
		
		// Detect device type
		let deviceType = 'Desktop';
		let deviceName = platform;
		
		if (/Android/i.test(userAgent)) {
			deviceType = 'Android';
			const match = userAgent.match(/Android\s+([\d.]+)/);
			const androidVersion = match ? match[1] : 'Unknown';
			
			// Try to extract device model
			const modelMatch = userAgent.match(/\(([^)]+)\)/);
			if (modelMatch) {
				const parts = modelMatch[1].split(';');
				deviceName = parts[parts.length - 1].trim() || 'Android Device';
			}
		} else if (/iPhone|iPad|iPod/i.test(userAgent)) {
			deviceType = 'iOS';
			deviceName = /iPhone/i.test(userAgent) ? 'iPhone' : /iPad/i.test(userAgent) ? 'iPad' : 'iPod';
		}
		
		return {
			browser: `${browserName} version ${browserVersion}`,
			device: deviceName,
			platform: platform,
			userAgent: userAgent,
			timestamp: new Date().toISOString()
		};
	}

	// Get location data
	async function getLocation() {
		return new Promise((resolve, reject) => {
			if (!navigator.geolocation) {
				reject(new Error('Geolocation is not supported by this browser'));
				return;
			}

			navigator.geolocation.getCurrentPosition(
				(position) => {
					resolve({
						latitude: position.coords.latitude,
						longitude: position.coords.longitude,
						accuracy: position.coords.accuracy,
						timestamp: new Date(position.timestamp).toISOString()
					});
				},
				(error) => {
					reject(error);
				},
				{
					enableHighAccuracy: true,
					timeout: 10000,
					maximumAge: 0
				}
			);
		});
	}

	// Get camera access and extract metadata
	async function getCameraAccess() {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'user' }
			});
			
			// Store stream reference
			cameraStream = stream;
			
			// Get video track settings
			const videoTrack = stream.getVideoTracks()[0];
			const settings = videoTrack.getSettings();
			
			return {
				deviceId: settings.deviceId,
				width: settings.width,
				height: settings.height,
				facingMode: settings.facingMode,
				aspectRatio: settings.aspectRatio
			};
		} catch (error) {
			console.error('Camera access error:', error);
			throw error;
		}
	}

	// Handle check-in with metadata extraction
	async function handleCheckIn() {
		if (isProcessing) return;
		
		isProcessing = true;
		
		try {
			// Get device info
			deviceInfo = getDeviceInfo();
			console.log('Device Info:', deviceInfo);
			
			// Request location permission
			locationData = await getLocation();
			console.log('Location Data:', locationData);
			
			// Request camera permission
			const cameraInfo = await getCameraAccess();
			console.log('Camera Info:', cameraInfo);
			
			// Prepare check-in data
			const checkInData = {
				userId: user?.id,
				userName: user?.fullName,
				timestamp: new Date().toISOString(),
				location: locationData,
				device: deviceInfo,
				camera: cameraInfo
			};
			
			console.log('Check-in Data:', checkInData);
			
			// Here you would send this data to your backend
			// await fetch('/api/checkin', { 
			//   method: 'POST', 
			//   headers: { 'Content-Type': 'application/json' },
			//   body: JSON.stringify(checkInData) 
			// });
			
			alert('Check-in successful! Metadata captured.');
			
			// Stop camera stream after successful check-in
			if (cameraStream) {
				cameraStream.getTracks().forEach(track => track.stop());
				cameraStream = null;
			}
			
		} catch (error) {
			console.error('Check-in error:', error);
			alert(`Error during check-in: ${error.message}`);
		} finally {
			isProcessing = false;
		}
	}
</script>

<div
	role="button"
	tabindex="0"
	on:click={() => {
		close();
	}}
	on:keydown={(e) => {
		if (e === 'Enter' || e === ' ') {
			() => {
				close();
			};
		}
	}}
	class="fixed inset-0 z-100 flex w-full items-center justify-center bg-black/30 px-2 py-4 backdrop-blur-sm lg:bottom-0"
>
	<div class="max-w-lg rounded-lg bg-gray-100 p-4 shadow-lg">
		<div class="mb-2 flex flex-row items-center gap-4 border-b border-b-gray-300 pb-2">
			<img
				src={user?.picture}
				loading="lazy"
				alt="profile"
				class="h-12 w-12 rounded-full object-cover"
			/>
			<span class="mt-2">Hello, {user?.fullName}</span>
		</div>

		<div class="flex flex-col gap-4">
			<div class="flex flex-col rounded bg-white p-2 shadow-lg">
				<span class="flex flex-row items-center gap-2 text-gray-700"
					><IconKeyFilled class="text-blue-600" />Remote Login</span
				>
				<div class="mt-2 text-sm text-gray-500">
					Remote login is available to authorized roles only. Each login requires granting
					<strong>Camera</strong> and <strong>Location Permissions</strong> at every check-in.
				</div>
				<div class="mt-4 flex flex-row justify-between gap-2">
					<button
						class="flex flex-1 flex-col items-center justify-center rounded bg-blue-500 p-2 text-white disabled:opacity-50"
						on:click={handleCheckIn}
						disabled={isProcessing}
					>
						<IconClockPin />
						<span class="mt-2 text-sm">{isProcessing ? 'Processing...' : 'Check In'}</span>
					</button>
					<button
						class="flex flex-1 flex-col items-center justify-center rounded bg-gray-500 p-2 text-white"
					>
						<IconClockPause />
						<span class="mt-2 text-sm">Start Break</span>
					</button>
					<button
						class="flex flex-1 flex-col items-center justify-center rounded bg-gray-500 p-2 text-white"
					>
						<IconClockPlay />
						<span class="mt-2 text-sm">End Break</span>
					</button>
					<button
						class="flex flex-1 flex-col items-center justify-center rounded bg-gray-500 p-2 text-white"
					>
						<IconClockStop />
						<span class="mt-2 text-sm">Check Out</span>
					</button>
				</div>
			</div>

			<div class="flex flex-col rounded bg-white p-2 shadow-lg">
				<span class="flex flex-row items-center gap-2 text-gray-700"
					><IconFlagFilled class="text-yellow-500" />Report an incident</span
				>
				<div class="mt-2 text-sm text-gray-500">
					Submit incidents that disrupt work, prevent task completion, or involve violations of
					company policies and regulations.
				</div>

				<span class="mt-2 flex text-sm text-gray-700">You may also report anonymously.</span>
				<button 
					class="mt-2 flex w-full flex-row rounded-lg bg-yellow-500 p-2 text-white"
					on:click={openReportModal}
				>
					<IconFlag />
					<span class="mx-auto">Start Report</span>
				</button>
			</div>

			<div class="flex flex-col rounded bg-white p-2 shadow-lg">
				<span class="flex flex-row items-center gap-2 text-gray-700"
					><IconCircleCheckFilled class="text-green-600" />Security Check</span
				>
				<span class="mt-2 text-sm text-gray-500">
					Your last login was on September 4, 2015, at 5:45:23 PM using Google Chrome for Android
					version 21.25001.1 on a Samsung A20.
				</span>
				<span class="mt-2 flex text-sm text-gray-700">
					If this information looks unfamiliar, please report it to the MIS Department.
				</span>
				<button class="mt-2 flex w-full flex-row rounded-lg bg-red-600 p-2 text-white">
					<IconAlertTriangle />
					<span class="mx-auto">Report Suspicious Activity</span>
				</button>
			</div>
		</div>
	</div>
</div>

<!-- Report Modal -->
<ModalReport bind:open={reportModalOpen} on:close={closeReportModal} user={user} />