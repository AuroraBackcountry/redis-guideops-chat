import React from 'react';
import type { Attachment } from 'stream-chat';

interface LocationAttachmentProps {
  attachment: Attachment & {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp?: number;
    address?: string;
  };
}

export const LocationAttachment: React.FC<LocationAttachmentProps> = ({ attachment }) => {
  const { latitude, longitude, accuracy, timestamp } = attachment;

  if (!latitude || !longitude) {
    return null;
  }

  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  const formatDate = (ts?: number) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleDateString();
  };

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleTimeString();
  };

  const formatAccuracy = (acc?: number) => {
    if (!acc) return '';
    return `±${Math.round(acc)}m`;
  };

  const openInMaps = () => {
    const url = `https://maps.google.com/?q=${latitude},${longitude}`;
    window.open(url, '_blank');
  };

  // Create OpenStreetMap iframe URL
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude-0.01},${latitude-0.01},${longitude+0.01},${latitude+0.01}&layer=mapnik&marker=${latitude},${longitude}`;

  return (
    <div className='location-attachment'>
      <div className='location-attachment__map-container'>
        <iframe
          src={mapUrl}
          className='location-attachment__map'
          title='Location Map'
          frameBorder='0'
          scrolling='no'
        />
        <div className='location-attachment__map-overlay' onClick={openInMaps} />
      </div>
      
      <div className='location-attachment__info-bar'>
        <div className='location-attachment__info-row'>
          <div className='location-attachment__info-item'>
            <span className='location-attachment__label'>Coordinates</span>
            <span className='location-attachment__value'>{formatCoordinates(latitude, longitude)}</span>
          </div>
          {accuracy && (
            <div className='location-attachment__info-item'>
              <span className='location-attachment__label'>Accuracy</span>
              <span className='location-attachment__value'>{formatAccuracy(accuracy)}</span>
            </div>
          )}
        </div>
        
        {timestamp && (
          <div className='location-attachment__info-row'>
            <div className='location-attachment__info-item'>
              <span className='location-attachment__label'>Date</span>
              <span className='location-attachment__value'>{formatDate(timestamp)}</span>
            </div>
            <div className='location-attachment__info-item'>
              <span className='location-attachment__label'>Time</span>
              <span className='location-attachment__value'>{formatTime(timestamp)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
