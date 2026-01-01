
import React, { useRef, useState } from 'react';

interface FileUploaderProps {
  onUpload: (base64Image: string) => void;
  dragAndDropText: string;
  orText: string;
  useCameraText: string;
  fromGalleryText: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({ 
  onUpload, 
  dragAndDropText, 
  orText, 
  useCameraText, 
  fromGalleryText 
}) => {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Allow re-selecting the same file
    event.target.value = ''; 
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      onUpload(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGalleryClick = () => {
    galleryInputRef.current?.click();
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };
  
  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  return (
    <div className="w-full">
      <label
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`flex flex-col justify-center items-center w-full h-64 px-4 transition bg-white dark:bg-gray-800 border-2 ${isDragging ? 'border-blue-400' : 'border-gray-300 dark:border-gray-600'} border-dashed rounded-[2.5rem] appearance-none cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none`}
      >
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span className="font-medium text-gray-600 dark:text-gray-400">
            {dragAndDropText}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-500">{orText}</span>
        </div>
        <div className="flex space-x-4 mt-6">
            <button
                type="button"
                onClick={handleCameraClick}
                className="px-6 py-3 text-sm font-bold uppercase tracking-wide text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-xl text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 transition-transform transform hover:scale-105 shadow-lg"
            >
                {useCameraText}
            </button>
            <button
                type="button"
                onClick={handleGalleryClick}
                className="px-6 py-3 text-sm font-bold uppercase tracking-wide text-gray-900 focus:outline-none bg-white rounded-xl border-2 border-gray-100 hover:bg-gray-50 hover:border-blue-200 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-600 transition-colors shadow-sm"
            >
                {fromGalleryText}
            </button>
        </div>
        <input
          type="file"
          name="gallery_upload"
          className="hidden"
          accept="image/*"
          ref={galleryInputRef}
          onChange={handleFileChange}
        />
        <input
          type="file"
          name="camera_upload"
          className="hidden"
          accept="image/*"
          capture="environment"
          ref={cameraInputRef}
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
};

export default FileUploader;
