import { useState, useRef, ChangeEvent } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Upload, Search, Loader2, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
  color: string;
}

export default function BookScanner() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState<string>('顾客行为心理学');
  const [loading, setLoading] = useState<boolean>(false);
  const [boundingBoxes, setBoundingBoxes] = useState<BoundingBox[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setBoundingBoxes([]);
      setError(null);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const findBook = async () => {
    if (!imageFile || !bookTitle.trim()) {
      setError('Please upload an image and enter a book title.');
      return;
    }

    setLoading(true);
    setError(null);
    setBoundingBoxes([]);

    try {
      const base64Data = await fileToBase64(imageFile);
      const mimeType = imageFile.type;
      const base64String = base64Data.split(',')[1];

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const prompt = `Locate all books whose titles contain or match the text "${bookTitle}" on this bookshelf. 
      Note that the text on the book spines is generally arranged vertically, which should help you with OCR and identifying the correct book.
      Also, consider that frequently borrowed books may have wear and tear, faded text, or partial occlusion. Please use robust OCR to handle noisy or degraded text on the spines, and do fuzzy matching if the user only provided a partial title.
      Return a list of their bounding box coordinates. The coordinates must be integers between 0 and 1000, 
      where 0,0 is the top-left corner and 1000,1000 is the bottom-right corner.
      Also, suggest a high-contrast CSS color (e.g., '#00FF00', '#FF00FF', '#FFFF00') that will stand out clearly against the books and their surroundings.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: [
          {
            inlineData: {
              data: base64String,
              mimeType: mimeType,
            },
          },
          { text: prompt },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              found: {
                type: Type.BOOLEAN,
                description: 'Whether any matching books were found in the image',
              },
              books: {
                type: Type.ARRAY,
                description: 'List of bounding boxes for matching books',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    ymin: {
                      type: Type.NUMBER,
                      description: 'Y min coordinate (0-1000, top edge)',
                    },
                    xmin: {
                      type: Type.NUMBER,
                      description: 'X min coordinate (0-1000, left edge)',
                    },
                    ymax: {
                      type: Type.NUMBER,
                      description: 'Y max coordinate (0-1000, bottom edge)',
                    },
                    xmax: {
                      type: Type.NUMBER,
                      description: 'X max coordinate (0-1000, right edge)',
                    },
                    color: {
                      type: Type.STRING,
                      description: 'A high contrast CSS hex color code',
                    },
                  },
                  required: ['ymin', 'xmin', 'ymax', 'xmax'],
                },
              },
            },
            required: ['found', 'books'],
          },
        },
      });

      if (!response.text) {
        throw new Error('Empty response from AI');
      }

      const result = JSON.parse(response.text);

      if (result.found && result.books && result.books.length > 0) {
        setBoundingBoxes(
          result.books.map((book: any) => ({
            ymin: book.ymin,
            xmin: book.xmin,
            ymax: book.ymax,
            xmax: book.xmax,
            color: book.color || '#00FF00',
          }))
        );
      } else {
        setError(`Could not find any books matching "${bookTitle}" in the image.`);
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while analyzing the image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 items-start">
      {/* Left Column: Controls */}
      <div className="w-full md:w-1/3 space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
        <div>
          <h2 className="text-lg font-semibold text-stone-800 mb-4">1. Upload Photo</h2>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition-colors border border-stone-300 border-dashed"
          >
            <Upload className="w-5 h-5" />
            {imageFile ? 'Change Photo' : 'Select Bookshelf Photo'}
          </button>
          {imageFile && (
            <p className="mt-2 text-sm text-stone-500 truncate">
              {imageFile.name}
            </p>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-stone-800 mb-4">2. Book Title</h2>
          <input
            type="text"
            value={bookTitle}
            onChange={(e) => setBookTitle(e.target.value)}
            placeholder="Enter book title..."
            className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
          />
        </div>

        <button
          onClick={findBook}
          disabled={!imageFile || !bookTitle.trim() || loading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-medium transition-colors shadow-sm"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Find Book
            </>
          )}
        </button>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm"
          >
            {error}
          </motion.div>
        )}
      </div>

      {/* Right Column: Preview */}
      <div className="w-full md:w-2/3 bg-stone-50 rounded-2xl border border-stone-200 min-h-[400px] flex items-center justify-center overflow-hidden relative">
        {!imagePreviewUrl ? (
          <div className="flex flex-col items-center justify-center text-stone-400 p-12 text-center">
            <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium text-stone-500">No image uploaded</p>
            <p className="text-sm mt-2">Upload a photo of a bookshelf to start searching.</p>
          </div>
        ) : (
          <div className="relative inline-block max-w-full">
            <img
              src={imagePreviewUrl}
              alt="Bookshelf Preview"
              className="max-w-full h-auto object-contain max-h-[70vh] rounded-lg shadow-sm"
            />
            
            <AnimatePresence>
              {boundingBoxes.map((box, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, type: 'spring', delay: index * 0.1 }}
                  className="absolute border-4 shadow-lg"
                  style={{
                    top: `${(box.ymin / 1000) * 100}%`,
                    left: `${(box.xmin / 1000) * 100}%`,
                    height: `${((box.ymax - box.ymin) / 1000) * 100}%`,
                    width: `${((box.xmax - box.xmin) / 1000) * 100}%`,
                    borderColor: box.color,
                    backgroundColor: `${box.color}33`, // 20% opacity hex
                  }}
                >
                  {/* Label */}
                  <div 
                    className="absolute -top-8 left-0 px-2 py-1 text-xs font-bold text-white rounded shadow-sm whitespace-nowrap"
                    style={{ backgroundColor: box.color }}
                  >
                    {bookTitle}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
