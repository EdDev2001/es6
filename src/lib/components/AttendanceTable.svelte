<div
  role="dialog"
  aria-modal="true"
  tabindex="0"
  class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
  on:click={closeImageModal}
  on:keydown={(e) => e.key === 'Escape' && closeImageModal()}
>
  <div class="bg-white p-6 rounded-lg shadow-2xl max-w-2xl max-h-full overflow-y-auto">
    <h3 class="text-lg font-bold mb-4">Captured Image</h3>
    <img src={selectedImage} alt="Attendance Snapshot" class="w-full h-auto rounded-md" />
    <button
      class="mt-4 w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition duration-200"
      on:click={closeImageModal}
    >
      Close
    </button>
  </div>
</div>
