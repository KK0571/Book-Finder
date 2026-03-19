/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import BookScanner from './components/BookScanner';

export default function App() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
      <header className="bg-white shadow-sm py-4 px-6 mb-8 border-b border-stone-200">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-sm">
            B
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-800">Book Finder</h1>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 pb-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-stone-900 mb-2">Find a book on your shelf</h2>
          <p className="text-stone-500 text-lg">Upload a photo of your bookshelf and let AI locate the book you're looking for.</p>
        </div>
        <BookScanner />
      </main>
    </div>
  );
}
