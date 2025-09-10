import { useState, useCallback } from 'react';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
  address?: string;
}

export interface GeolocationError {
  code: number;
  message: string;
}

export interface UseGeolocationReturn {
  getCurrentLocation: () => Promise<LocationData>;
  isLoading: boolean;
  error: GeolocationError | null;
  clearError: () => void;
}

export const useGeolocation = (): UseGeolocationReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<GeolocationError | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getCurrentLocation = useCallback((): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const geoError: GeolocationError = {
          code: 0,
          message: 'Geolocation is not supported by this browser.'
        };
        setError(geoError);
        reject(geoError);
        return;
      }

      setIsLoading(true);
      setError(null);

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // Cache for 1 minute
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsLoading(false);
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          resolve(locationData);
        },
        (positionError) => {
          setIsLoading(false);
          let message = 'An unknown error occurred.';
          
          switch (positionError.code) {
            case positionError.PERMISSION_DENIED:
              message = 'Location access denied by user.';
              break;
            case positionError.POSITION_UNAVAILABLE:
              message = 'Location information is unavailable.';
              break;
            case positionError.TIMEOUT:
              message = 'Location request timed out.';
              break;
          }

          const geoError: GeolocationError = {
            code: positionError.code,
            message
          };
          setError(geoError);
          reject(geoError);
        },
        options
      );
    });
  }, []);

  return {
    getCurrentLocation,
    isLoading,
    error,
    clearError
  };
};
