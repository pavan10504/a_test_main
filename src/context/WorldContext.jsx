import { createContext, useContext, useState, useEffect } from 'react';
import { World } from '../components/world';

const WorldContext = createContext();

export const useWorld = () => {
  const context = useContext(WorldContext);
  if (!context) {
    throw new Error('useWorld must be used within a WorldProvider');
  }
  return context;
};

export const WorldProvider = ({ children }) => {
  const [world, setWorld] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadWorld = () => {
    const savedWorld = localStorage.getItem('virtualWorld');
    if (savedWorld) {
      try {
        const worldData = JSON.parse(savedWorld);
        const loadedWorld = World.load(worldData);
        setWorld(loadedWorld);
        setIsLoaded(true);
        return loadedWorld;
      } catch (error) {
        console.error('Failed to load world:', error);
        const newWorld = new World();
        setWorld(newWorld);
        setIsLoaded(false);
        return newWorld;
      }
    } else {
      const newWorld = new World();
      setWorld(newWorld);
      setIsLoaded(false);
      return newWorld;
    }
  };

  const saveWorld = (worldToSave = world) => {
    if (worldToSave) {
      const worldData = {
        graph: worldToSave.graph,
        markings: worldToSave.markings,
        timestamp: Date.now()
      };
      localStorage.setItem('virtualWorld', JSON.stringify(worldData));
      setIsLoaded(true);
      return true;
    }
    return false;
  };

  const clearWorld = () => {
    localStorage.removeItem('virtualWorld');
    const newWorld = new World();
    setWorld(newWorld);
    setIsLoaded(false);
  };

  const value = {
    world,
    isLoaded,
    loadWorld,
    saveWorld,
    clearWorld,
    setWorld
  };

  return (
    <WorldContext.Provider value={value}>
      {children}
    </WorldContext.Provider>
  );
};
