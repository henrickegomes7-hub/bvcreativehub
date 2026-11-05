import React, { useState } from 'react';
import { GraphicTemplate } from '../../types';
import { Button } from '../ui/Button';
import { FileBox, Download, ExternalLink, Filter, Layers, LayoutTemplate } from 'lucide-react';

interface TemplatesViewProps {
  templates: GraphicTemplate[];
  onDownloadTemplate: (id: string) => void;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({
  templates,
  onDownloadTemplate,
}) => {
  const [selectedSoftware, setSelectedSoftware] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filtered = templates.filter((t) => {
    if (selectedSoftware !== 'all' && t.software !== selectedSoftware) return false;
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
    return true;
  });

  const getSoftwareBadgeColor = (sw: GraphicTemplate['software']) => {
    switch (sw) {
      case 'Figma': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Photoshop': return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'Illustrator': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'PowerPoint': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-[#0E172E] rounded-xl p-5 border border-slate-200 dark:border-[#1F3057] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-blue-50 dark:bg-[#083181]/30 text-[#083181] dark:text-blue-300 rounded-md">
              <LayoutTemplate className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Banco de Templates Gráficos Padronizados
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Arquivos base homologados em Figma, Photoshop e PowerPoint para acelerar o desenvolvimento de campanhas BV.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedSoftware}
            onChange={(e) => setSelectedSoftware(e.target.value)}
            className="text-xs px-3 py-1.5 bg-slate-50 dark:bg-[#131F3D] border border-slate-200 dark:border-[#1F3057] rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#083181]/30 focus:border-[#083181]"
          >
            <option value="all">Todos os Softwares</option>
            <option value="Figma">Figma</option>
            <option value="Photoshop">Photoshop</option>
            <option value="PowerPoint">PowerPoint</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs px-3 py-1.5 bg-slate-50 dark:bg-[#131F3D] border border-slate-200 dark:border-[#1F3057] rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#083181]/30 focus:border-[#083181]"
          >
            <option value="all">Todas as Categorias</option>
            <option value="social">Social Media</option>
            <option value="presentation">Apresentações</option>
            <option value="corporate">Corporativo</option>
            <option value="digital">Mídia Display</option>
          </select>
        </div>
      </div>

      {/* Grid of Templates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((tmpl) => (
          <div
            key={tmpl.id}
            className="bg-white dark:bg-[#0E172E] rounded-xl border border-slate-200 dark:border-[#1F3057] shadow-xs hover:border-[#083181] dark:hover:border-blue-400 hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
          >
            {/* Visual Thumbnail */}
            <div className="relative aspect-video bg-slate-100 dark:bg-[#131F3D] overflow-hidden">
              <img
                src={tmpl.preview_url}
                alt={tmpl.title}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
              <span
                className={`absolute top-2.5 left-2.5 px-2 py-0.5 text-[11px] font-bold rounded border shadow-xs ${getSoftwareBadgeColor(
                  tmpl.software
                )}`}
              >
                {tmpl.software}
              </span>
              <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 text-[10px] font-mono font-bold bg-black/70 text-white rounded backdrop-blur-xs">
                {tmpl.dimensions}
              </span>
            </div>

            {/* Template Body */}
            <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{tmpl.title}</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {tmpl.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  {tmpl.file_size} • {tmpl.downloads} downloads
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onDownloadTemplate(tmpl.id)}
                  icon={<Download className="w-3.5 h-3.5" />}
                >
                  Usar Template
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
