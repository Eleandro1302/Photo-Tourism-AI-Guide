
import React from 'react';
import { GroundingChunk } from '../types';

interface CitationCardProps {
  chunk: GroundingChunk;
}

const CitationCard: React.FC<CitationCardProps> = ({ chunk }) => {
  const { web, maps } = chunk;
  
  const link = web?.uri || maps?.uri;
  const title = web?.title || maps?.title;
  const isMaps = !!maps;

  if (!link) return null;

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className={`block p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border ${isMaps ? 'border-green-200 dark:border-green-900' : 'border-gray-200 dark:border-gray-700'}`}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
            {isMaps ? (
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
            ) : (
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
              </svg>
            )}
        </div>
        <div>
            <h4 className="text-md font-semibold text-gray-900 dark:text-white truncate" title={title ?? ''}>
                {title || (isMaps ? 'View on Maps' : 'Visit Website')}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate" title={link}>
                {new URL(link).hostname}
            </p>
        </div>
      </div>
    </a>
  );
};

export default CitationCard;
