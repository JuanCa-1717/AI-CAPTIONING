// OCR Web Worker to process Tesseract operations off the main thread
importScripts('https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js');

let worker = null;

// Initialize Tesseract worker
async function initWorker(language) {
  if (worker) {
    await worker.terminate();
  }
  
  worker = await Tesseract.createWorker({
    logger: m => {
      // Send progress updates to main thread
      if (m.status === 'recognizing text') {
        self.postMessage({
          type: 'progress',
          progress: m.progress,
          status: m.status
        });
      }
    }
  });
  
  await worker.loadLanguage(language);
  await worker.initialize(language);
  
  return worker;
}

// Process OCR on image
async function processOCR(imageData, language) {
  try {
    if (!worker) {
      await initWorker(language);
    }
    
    self.postMessage({
      type: 'progress',
      progress: 0,
      status: 'starting recognition'
    });
    
    const { data } = await worker.recognize(imageData);
    
    self.postMessage({
      type: 'progress',
      progress: 1,
      status: 'recognition complete'
    });
    
    return data.text;
  } catch (error) {
    throw new Error(`OCR processing failed: ${error.message}`);
  }
}

// Handle messages from main thread
self.onmessage = async function(e) {
  const { type, imageData, language, id } = e.data;
  
  try {
    switch (type) {
      case 'process':
        const text = await processOCR(imageData, language);
        self.postMessage({
          type: 'success',
          text: text,
          id: id
        });
        break;
        
      case 'terminate':
        if (worker) {
          await worker.terminate();
          worker = null;
        }
        self.postMessage({
          type: 'terminated'
        });
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error.message,
      id: id
    });
  }
};