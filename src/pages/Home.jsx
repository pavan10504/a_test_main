import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function Home() {
  const [hasWorld, setHasWorld] = useState(false);

  useEffect(() => {
    const savedWorld = localStorage.getItem('virtualWorld');
    setHasWorld(!!savedWorld);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            Virtual World Car Simulator
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Build roads, train AI cars, drive manually, or simulate a busy city
          </p>
          
          {/* World Status */}
          <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
            hasWorld 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              hasWorld ? 'bg-green-500' : 'bg-yellow-500'
            }`}></div>
            {hasWorld ? 'World Ready' : 'No World Created'}
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* World Builder */}
          <Link
            to="/world-builder"
            className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group"
          >
            <div className="text-center">
              <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">
                🏗️
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                World Builder
              </h2>
              <p className="text-gray-600 mb-4">
                Create custom roads, add traffic signs, and design your virtual world
              </p>
              <div className="text-blue-600 font-semibold">
                {hasWorld ? 'Edit World →' : 'Start Building →'}
              </div>
              {!hasWorld && (
                <div className="text-xs text-yellow-600 mt-2">
                  ⚠️ Create a world first
                </div>
              )}
            </div>
          </Link>

          {/* AI Training */}
          <Link
            to="/car/auto"
            className={`bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group ${
              !hasWorld ? 'opacity-50' : ''
            }`}
          >
            <div className="text-center">
              <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">
                🤖
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                AI Training
              </h2>
              <p className="text-gray-600 mb-4">
                Watch AI cars learn to navigate through your world using neural networks
              </p>
              <div className={`font-semibold ${
                hasWorld ? 'text-red-600' : 'text-gray-400'
              }`}>
                Train AI →
              </div>
              {!hasWorld && (
                <div className="text-xs text-gray-500 mt-2">
                  Requires a world
                </div>
              )}
            </div>
          </Link>

          {/* Manual Driving */}
          <Link
            to="/car/manual"
            className={`bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group ${
              !hasWorld ? 'opacity-50' : ''
            }`}
          >
            <div className="text-center">
              <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">
                🎮
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Manual Drive
              </h2>
              <p className="text-gray-600 mb-4">
                Take control and drive through your world using keyboard controls
              </p>
              <div className={`font-semibold ${
                hasWorld ? 'text-blue-600' : 'text-gray-400'
              }`}>
                Start Driving →
              </div>
              {!hasWorld && (
                <div className="text-xs text-gray-500 mt-2">
                  Requires a world
                </div>
              )}
            </div>
          </Link>

          {/* City Simulation */}
          <Link
            to="/city-simulation"
            className={`bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group ${
              !hasWorld ? 'opacity-50' : ''
            }`}
          >
            <div className="text-center">
              <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">
                🏙️
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                City Simulation
              </h2>
              <p className="text-gray-600 mb-4">
                Watch trained AI cars navigate through a busy city simulation
              </p>
              <div className={`font-semibold ${
                hasWorld ? 'text-green-600' : 'text-gray-400'
              }`}>
                Run Simulation →
              </div>
              {!hasWorld && (
                <div className="text-xs text-gray-500 mt-2">
                  Requires trained AI
                </div>
              )}
            </div>
          </Link>
        </div>

        <div className="mt-12 text-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 inline-block">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              How it works
            </h3>
            <p className="text-gray-600 text-sm max-w-2xl">
              1. Build your world with roads and traffic elements
              2. Train AI cars using neural networks and genetic algorithms
              3. Drive manually, run city simulations, or watch AI learn
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
