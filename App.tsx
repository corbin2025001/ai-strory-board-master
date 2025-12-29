
import React, { useState, useCallback } from 'react';
import { ShotSize, ShotSizeLabels, StoryboardResult, AnalysisStatus } from './types';
import { geminiService } from './services/geminiService';
import { Camera, Image as ImageIcon, Sparkles, Copy, Check, Globe, RefreshCcw, Trash2, Settings2 } from 'lucide-react';

const App: React.FC = () => {
  const [images, setImages] = useState<string[]>([]);
  const [selectedShots, setSelectedShots] = useState<ShotSize[]>(new Array(9).fill(ShotSize.Medium));
  const [status, setStatus] = useState<AnalysisStatus>({ step: 'idle', message: '' });
  const [result, setResult] = useState<StoryboardResult | null>(null);
  const [language, setLanguage] = useState<'en' | 'cn'>('cn');
  const [copied, setCopied] = useState(false);
  
  // Track which specific shot is currently regenerating
  const [regeneratingShotId, setRegeneratingShotId] = useState<number | null>(null);

  // Fix: Added explicit type cast for files to ensure reader.readAsDataURL receives a Blob
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleShotChange = (index: number, size: ShotSize) => {
    const newShots = [...selectedShots];
    newShots[index] = size;
    setSelectedShots(newShots);
  };

  const generateStoryboard = async () => {
    if (images.length === 0) {
      alert("Please upload at least one image.");
      return;
    }
    
    setStatus({ step: 'analyzing', message: 'Analyzing your reference images and generating shots...' });
    
    try {
      const data = await geminiService.analyzeAndGenerate(images, selectedShots);
      setResult(data);
      setStatus({ step: 'completed', message: 'Generation successful!' });
    } catch (error) {
      setStatus({ step: 'error', message: 'Failed to generate storyboard. Please check your API key or try again.' });
    }
  };

  const handleSingleShotRegenerate = async (index: number) => {
    if (!result) return;
    
    setRegeneratingShotId(index);
    try {
      // Use the currently selected size for this shot
      const currentSize = selectedShots[index];
      const newDescription = await geminiService.regenerateShot(
        result.scenePrompt,
        index + 1, // Shot IDs are usually 1-based in our logic
        currentSize
      );

      // Update the specific shot in the result state
      setResult(prev => {
        if (!prev) return null;
        const newShots = [...prev.shots];
        // Ensure we are updating the correct index. 
        // Assuming result.shots matches index order 0-8.
        if (newShots[index]) {
            newShots[index] = {
                ...newShots[index],
                description: newDescription
            };
        }
        return {
            ...prev,
            shots: newShots
        };
      });
    } catch (error) {
      console.error("Failed to regenerate shot", error);
      alert("Failed to regenerate specific shot. Please try again.");
    } finally {
      setRegeneratingShotId(null);
    }
  };

  const getFinalPrompt = () => {
    if (!result) return "";
    
    const isCN = language === 'cn';
    const scene = isCN ? result.scenePrompt.cn : result.scenePrompt.en;
    
    let prompt = isCN 
      ? `根据[${scene}]，生成一张具有凝聚力的[3x3]网格图像，包含在同一环境中的[9]个不同摄像机镜头，严格保持人物/物体、服装和光线的一致性，8K分辨率，16:9 画幅，\n`
      : `Based on [${scene}], generate a cohesive [3x3] grid image featuring [9] different camera shots in the same environment, strictly maintaining consistency in character/object, clothing, and lighting, 8K resolution, 16:9 aspect ratio,\n`;

    result.shots.forEach((shot, idx) => {
      const desc = isCN ? shot.description.cn : shot.description.en;
      prompt += `${isCN ? '镜头' : 'Shot'} ${String(idx + 1).padStart(2, '0')}: ${desc}\n`;
    });

    return prompt;
  };

  const copyToClipboard = () => {
    const text = getFinalPrompt();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto space-y-8 bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent flex items-center gap-2">
            <Camera className="w-8 h-8 text-blue-400" />
            AI Storyboard Master
          </h1>
          <p className="text-slate-400 mt-1">Generate consistent Midjourney-style storyboard prompts from your images.</p>
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={() => setLanguage(l => l === 'en' ? 'cn' : 'en')}
             className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800"
           >
             <Globe className="w-4 h-4" />
             {language === 'cn' ? '切换英文 (EN)' : 'Switch to Chinese (CN)'}
           </button>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Upload & Config */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-blue-400" />
              1. Reference Images
            </h2>
            <div className="flex flex-wrap gap-4">
              {images.map((img, i) => (
                <div key={i} className="relative group w-24 h-24 rounded-lg overflow-hidden border border-slate-700">
                  <img src={img} alt={`Ref ${i}`} className="w-full h-full object-cover" />
                  <button 
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-slate-800/50 transition-all">
                <span className="text-xs text-slate-400">Upload</span>
                <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
            <p className="text-xs text-slate-500 italic">Upload images of your character, outfit, or environment.</p>
          </section>

          <section className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              2. Storyboard Settings
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {selectedShots.map((shot, i) => (
                <div key={i} className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Shot {i+1}</label>
                  <select 
                    value={shot}
                    onChange={(e) => handleShotChange(i, e.target.value as ShotSize)}
                    className="w-full bg-slate-950 text-xs p-2 rounded border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-300"
                  >
                    {Object.values(ShotSize).map(size => (
                      <option key={size} value={size}>
                        {language === 'cn' ? ShotSizeLabels[size].cn : ShotSizeLabels[size].en}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <button 
              disabled={status.step === 'analyzing' || images.length === 0}
              onClick={generateStoryboard}
              className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                status.step === 'analyzing' 
                ? 'bg-slate-800 cursor-not-allowed text-slate-500' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg hover:shadow-blue-500/25'
              }`}
            >
              {status.step === 'analyzing' ? (
                <>
                  <RefreshCcw className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Storyboard Prompt
                </>
              )}
            </button>
          </section>

          {status.step === 'error' && (
            <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-xl text-red-400 text-sm">
              {status.message}
            </div>
          )}
        </div>

        {/* Right Column: Result */}
        <div className="lg:col-span-7">
          <section className="bg-slate-900/50 h-full min-h-[500px] p-6 rounded-2xl border border-slate-800 flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-semibold">Generated Prompt Output</h2>
              {result && (
                <button 
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium transition-all"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Prompt'}
                </button>
              )}
            </div>

            {result ? (
              <div className="flex-grow overflow-auto">
                <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                  {getFinalPrompt()}
                </pre>
                
                <div className="mt-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-slate-100 border-l-4 border-blue-500 pl-3">Visual Breakdown & Tuning</h3>
                    <p className="text-xs text-slate-500">Change shot size and click refresh to update description</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.shots.map((shot, i) => (
                      <div key={i} className="p-4 bg-slate-950/40 rounded-lg border border-slate-800/50 flex flex-col gap-3 group hover:border-blue-500/30 transition-all">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-blue-400 uppercase">Shot {i+1}</span>
                          <div className="flex items-center gap-2">
                             <select 
                               value={selectedShots[i]}
                               onChange={(e) => handleShotChange(i, e.target.value as ShotSize)}
                               className="bg-slate-900 text-[10px] p-1.5 rounded border border-slate-700 focus:border-blue-500 text-slate-300 max-w-[120px]"
                             >
                               {Object.values(ShotSize).map(size => (
                                 <option key={size} value={size}>
                                   {language === 'cn' ? ShotSizeLabels[size].cn : ShotSizeLabels[size].en}
                                 </option>
                               ))}
                             </select>
                             <button 
                               onClick={() => handleSingleShotRegenerate(i)}
                               disabled={regeneratingShotId === i}
                               title="Regenerate this shot description"
                               className="p-1.5 bg-slate-800 hover:bg-blue-600 rounded text-slate-300 hover:text-white transition-colors border border-slate-700"
                             >
                               <RefreshCcw className={`w-3.5 h-3.5 ${regeneratingShotId === i ? 'animate-spin' : ''}`} />
                             </button>
                          </div>
                        </div>
                        <p className={`text-sm text-slate-300 transition-opacity ${regeneratingShotId === i ? 'opacity-50' : 'opacity-100'}`}>
                          {language === 'cn' ? shot.description.cn : shot.description.en}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-slate-600 space-y-4 italic">
                {status.step === 'analyzing' ? (
                  <div className="text-center">
                    <RefreshCcw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
                    <p className="not-italic text-slate-400">AI is imagining your storyboard...</p>
                  </div>
                ) : (
                  <>
                    <Camera className="w-16 h-16 opacity-10" />
                    <p>Upload references and click Generate to see the magic.</p>
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Footer Instructions */}
      <footer className="mt-12 p-6 bg-slate-900/50 rounded-2xl border border-slate-900 text-center">
        <p className="text-slate-500 text-sm">
          Tip: For best results, use "--stylize 250" or "--chaos 10" in Midjourney. This tool ensures that your character and environment details stay consistent across the 3x3 grid.
        </p>
      </footer>
    </div>
  );
};

export default App;
