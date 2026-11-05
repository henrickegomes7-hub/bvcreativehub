import React, { useState } from 'react';
import { BrandAsset } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { 
  Palette, 
  Download, 
  Copy, 
  Check, 
  FileText, 
  Type, 
  Image as ImageIcon, 
  Plus, 
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface BibliotecaViewProps {
  assets: BrandAsset[];
  onDownloadAsset: (id: string) => void;
  onAddAsset: (asset: BrandAsset) => void;
}

export const BibliotecaView: React.FC<BibliotecaViewProps> = ({
  assets,
  onDownloadAsset,
  onAddAsset,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Asset State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<BrandAsset['category']>('logos');
  const [format, setFormat] = useState('SVG');
  const [description, setDescription] = useState('');
  const [hexColor, setHexColor] = useState('#083181');

  const filteredAssets = assets.filter((a) => {
    if (activeCategory === 'all') return true;
    return a.category === activeCategory;
  });

  const handleCopyColor = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 2000);
  };

  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddAsset({
      id: `asset-${Date.now()}`,
      title: title.trim(),
      category,
      format,
      file_url: category === 'colors' ? hexColor : '/assets/aistudio/Logo_plano_BV_PNG_f061e8a5.png',
      hex_color: category === 'colors' ? hexColor : undefined,
      description: description.trim() || 'Ativo institucional registrado no hub.',
      download_count: 0,
      tags: ['Oficial', category],
      updated_at: new Date().toISOString().split('T')[0],
    });

    setTitle('');
    setDescription('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Brand Hero Header */}
      <div className="bg-[#083181] rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#083181] relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(197,106,45,0.25),transparent_70%)] pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 bg-white/15 rounded-md">
              <Palette className="w-4 h-4 text-[#e8dda5]" />
            </span>
            <span className="text-xs font-semibold text-[#e8dda5]">Brand Asset Center BV</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Identidade Visual Oficial do Grupo BV
          </h2>
          <p className="text-xs text-white/90 mt-1 max-w-xl">
            Repositório único com logos vetorizados, paleta cromática (<strong className="text-[#e8dda5]">Azul #083181, Laranja #c56a2d, Verde #a0b900, Amarelo Texto #e8dda5</strong>), tipografia e manual.
          </p>
        </div>

        <Button
          variant="accent"
          size="sm"
          onClick={() => setShowAddModal(true)}
          icon={<Plus className="w-4 h-4 text-[#e8dda5]" />}
          className="relative z-10 bg-[#c56a2d] hover:bg-[#ad5922] text-white shadow-md border border-[#c56a2d]"
        >
          Novo Ativo de Marca
        </Button>
      </div>

      {/* Categories Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-[#1F3057]">
        {[
          { id: 'all', label: 'Todos os Ativos' },
          { id: 'logos', label: 'Logotipos Oficiais' },
          { id: 'colors', label: 'Cores Institucionais' },
          { id: 'typography', label: 'Tipografia' },
          { id: 'guidelines', label: 'Manual & Diretrizes' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCategory(tab.id)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 ${
              activeCategory === tab.id
                ? 'bg-[#083181] text-white shadow-xs'
                : 'bg-white dark:bg-[#0E172E] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-[#1F3057]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Asset Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAssets.map((asset) => {
          const isColor = asset.category === 'colors' && asset.hex_color;

          return (
            <div
              key={asset.id}
              className="bg-white dark:bg-[#0E172E] rounded-xl border border-slate-200 dark:border-[#1F3057] shadow-xs hover:border-[#083181] dark:hover:border-blue-400 hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
            >
              {/* Asset Preview Header */}
              {isColor ? (
                <div
                  className="h-28 w-full flex items-center justify-center p-4 relative group cursor-pointer"
                  style={{ backgroundColor: asset.hex_color }}
                  onClick={() => handleCopyColor(asset.hex_color!)}
                >
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 backdrop-blur-xs font-medium"
                  >
                    {copiedHex === asset.hex_color ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copiar HEX
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="h-28 w-full bg-slate-100 dark:bg-[#131F3D] flex items-center justify-center p-4 border-b border-slate-100 dark:border-[#1F3057] relative">
                  {asset.category === 'logos' ? (
                    <div className="w-16 h-16 rounded-xl bg-[#083181] border border-white/20 flex items-center justify-center p-2 shadow-sm overflow-hidden">
                      <img
                        src={asset.preview_url || '/assets/aistudio/Logo_plano_BV_PNG_f061e8a5.png'}
                        alt={asset.title}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : asset.category === 'typography' ? (
                    <div className="text-center">
                      <Type className="w-8 h-8 text-[#083181] dark:text-[#a0b900] mx-auto mb-1" />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Inter & Plus Jakarta</span>
                    </div>
                  ) : (
                    <FileText className="w-10 h-10 text-[#083181] dark:text-[#a0b900]" />
                  )}
                  <span className="absolute top-2 right-2 text-[10px] font-mono font-bold px-1.5 py-0.5 bg-white dark:bg-[#0E172E] text-slate-700 dark:text-slate-300 rounded shadow-2xs">
                    {asset.format}
                  </span>
                </div>
              )}

              {/* Asset Body */}
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#083181] dark:text-blue-300 uppercase tracking-wider">
                      {asset.category}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {asset.download_count} downloads
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">{asset.title}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {asset.description}
                  </p>
                </div>

                {/* Color Hex & RGB Code Badges */}
                {isColor && (
                  <div className="pt-2 flex items-center justify-between text-xs font-mono">
                    <button
                      onClick={() => handleCopyColor(asset.hex_color!)}
                      className="px-2 py-1 bg-slate-100 dark:bg-[#131F3D] hover:bg-slate-200 dark:hover:bg-[#1E293B] text-slate-800 dark:text-slate-200 rounded font-bold flex items-center gap-1"
                    >
                      {copiedHex === asset.hex_color ? <Check className="w-3 h-3 text-[#a0b900]" /> : <Copy className="w-3 h-3 text-slate-400" />}
                      {asset.hex_color}
                    </button>
                    <span className="text-[10px] text-slate-400">{asset.rgb_color}</span>
                  </div>
                )}

                {/* Download Button */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Rev: {asset.updated_at}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDownloadAsset(asset.id)}
                    icon={<Download className="w-3.5 h-3.5 text-[#083181] dark:text-[#a0b900]" />}
                  >
                    Baixar
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Novo Ativo */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0E172E] rounded-2xl p-6 max-w-md w-full border border-slate-200 dark:border-[#1F3057] shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Cadastrar Ativo de Marca</h3>
            <form onSubmit={handleSaveAsset} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Título do Ativo *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Logo BV Varejo - Versão Horizontal"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as BrandAsset['category'])}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                >
                  <option value="logos">Logotipos Oficiais</option>
                  <option value="colors">Cores Institucionais</option>
                  <option value="typography">Tipografia</option>
                  <option value="guidelines">Manual / Guidelines</option>
                </select>
              </div>

              {category === 'colors' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Código HEX</label>
                  <input
                    type="text"
                    value={hexColor}
                    onChange={(e) => setHexColor(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Formato</label>
                  <input
                    type="text"
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    placeholder="SVG, PNG, PDF..."
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Instruções de aplicação..."
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Salvar Ativo
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
