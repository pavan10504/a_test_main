import React from "react";
import { Link } from "react-router-dom";

export default function NeuralHomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            Neural Network Builder
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Build and customize neural networks with different sensor
            configurations
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Simple Neural Network */}
          <Link
            to="/neural/simple"
            className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group"
          >
            <div className="text-center">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
                🧠
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                Basic Builder
              </h2>
              <p className="text-gray-600 mb-4">
                Build networks with 3 sensor inputs - drag neurons and create
                custom architectures
              </p>
              <div className="text-green-600 font-semibold">
                Build Network →
              </div>
            </div>
          </Link>

          {/* Advanced Neural Network */}
          <Link
            to="/neural/advanced"
            className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group"
          >
            <div className="text-center">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
                ⚡
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                Intermediate Builder
              </h2>
              <p className="text-gray-600 mb-4">
                Build networks with 5 sensor inputs - more complexity with
                interactive neuron placement
              </p>
              <div className="text-blue-600 font-semibold">Build Network →</div>
            </div>
          </Link>

          {/* Complete Neural Network */}
          <Link
            to="/neural/complete"
            className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group"
          >
            <div className="text-center">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
                ✨
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                Advanced Builder
              </h2>
              <p className="text-gray-600 mb-4">
                Build networks with 7 sensor inputs - full control over network
                architecture
              </p>
              <div className="text-purple-600 font-semibold mb-0">
                Build Network →
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-12 text-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 inline-block">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              How it works
            </h3>
            <p className="text-gray-600 text-sm max-w-2xl">
              Drag and drop neurons to build custom network architectures. Start
              with 3 sensors, progress to 5 sensors, and master complex networks
              with 7 sensor inputs
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
