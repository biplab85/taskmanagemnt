import { useState, useRef } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Palette, Type, Sun, Moon, Image, RotateCcw, Check, Upload } from 'lucide-react';
import { toast } from 'sonner';

export function SettingsPage() {
  const { settings, updateSettings, resetSettings, fontOptions, colorPresets } = useSettings();
  const { theme, toggleTheme } = useTheme();
  const [customColor, setCustomColor] = useState(settings.brandColor);
  const [logoText, setLogoText] = useState(settings.logoText);
  const [projectName, setProjectName] = useState(settings.projectName);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleColorSelect = (color: string) => {
    setCustomColor(color);
    updateSettings({ brandColor: color });
    toast.success('Theme color updated');
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomColor(color);
    if (/^#[0-9a-fA-F]{6}$/.test(color)) {
      updateSettings({ brandColor: color });
    }
  };

  const handleFontChange = (font: string) => {
    updateSettings({ fontFamily: font });
    toast.success('Font updated');
  };

  const handleLogoTextSave = () => {
    updateSettings({ logoText: logoText.slice(0, 2) || 'S' });
    toast.success('Logo updated');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be under 2MB');
      return;
    }
    // Resize the image to 128x128 for crisp display at 36px sidebar size
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 128;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        // Fill transparent background
        ctx.clearRect(0, 0, size, size);
        // Scale image to fit inside 128x128 while maintaining aspect ratio
        const scale = Math.min(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (size - w) / 2;
        const y = (size - h) / 2;
        ctx.drawImage(img, x, y, w, h);
        const resized = canvas.toDataURL('image/png');
        updateSettings({ logoUrl: resized });
        toast.success('Logo uploaded');
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDefaultThemeChange = (value: 'light' | 'dark') => {
    updateSettings({ defaultTheme: value });
    if (theme !== value) toggleTheme();
    toast.success(`Default theme set to ${value} mode`);
  };

  const handleProjectNameSave = () => {
    updateSettings({ projectName: projectName.trim() || 'SKLENTR' });
    toast.success('Project name updated');
  };

  const handleReset = () => {
    resetSettings();
    setCustomColor('#2563eb');
    setLogoText('S');
    setProjectName('SKLENTR');
    toast.success('Settings reset to defaults');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Customize the appearance of your workspace</p>
        </div>
        <Button variant="outline" onClick={handleReset} className="gap-2 cursor-pointer">
          <RotateCcw className="h-4 w-4" />
          Reset All
        </Button>
      </div>

      {/* Logo */}
      <Card className="border-0 shadow-md overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Image className="h-4 w-4 text-brand-500" />
            Application Logo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand-500/25 shrink-0 overflow-hidden">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
              ) : (
                <span className="text-2xl font-bold text-white">{settings.logoText}</span>
              )}
            </div>
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2">
                <div className="space-y-1 flex-1">
                  <Label className="text-xs text-muted-foreground">Logo Text (1-2 characters)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={logoText}
                      onChange={(e) => setLogoText(e.target.value.slice(0, 2))}
                      maxLength={2}
                      className="w-24"
                    />
                    <Button size="sm" onClick={handleLogoTextSave} className="bg-brand-600 hover:bg-brand-700 cursor-pointer">
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2 cursor-pointer"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Image
                  </Button>
                  {settings.logoUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { updateSettings({ logoUrl: null }); toast.success('Logo image removed'); }}
                      className="text-muted-foreground cursor-pointer"
                    >
                      Remove image
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Recommended: Square image (e.g. 128x128px). PNG with transparent background works best. The image will be auto-resized to fit the sidebar (36x36px display).
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Name */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Type className="h-4 w-4 text-brand-500" />
            Project Name
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name"
              className="max-w-xs"
            />
            <Button size="sm" onClick={handleProjectNameSave} className="bg-brand-600 hover:bg-brand-700 cursor-pointer gap-1.5">
              <Check className="h-4 w-4" />
              Save
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Displayed in the sidebar footer. Default: SKLENTR
          </p>
        </CardContent>
      </Card>

      {/* Theme Color */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4 text-brand-500" />
            Theme Color
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
            {colorPresets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handleColorSelect(preset.value)}
                className={`group relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all cursor-pointer ${
                  settings.brandColor === preset.value
                    ? 'border-foreground shadow-md scale-105'
                    : 'border-transparent hover:border-border hover:shadow-sm'
                }`}
              >
                <div
                  className="h-8 w-8 rounded-full shadow-inner transition-transform group-hover:scale-110"
                  style={{ backgroundColor: preset.value }}
                />
                <span className="text-[10px] font-medium text-muted-foreground">{preset.label}</span>
                {settings.brandColor === preset.value && (
                  <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-foreground">
                    <Check className="h-2.5 w-2.5 text-background" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Label className="text-sm text-muted-foreground shrink-0">Custom color:</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customColor}
                onChange={(e) => handleColorSelect(e.target.value)}
                className="h-9 w-9 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
              />
              <Input
                value={customColor}
                onChange={handleCustomColorChange}
                className="w-28 font-mono text-sm"
                maxLength={7}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Font Family */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Type className="h-4 w-4 text-brand-500" />
            Font Family
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {fontOptions.map((font) => (
              <button
                key={font.value}
                onClick={() => handleFontChange(font.value)}
                className={`rounded-xl border-2 px-4 py-3 text-left transition-all cursor-pointer ${
                  settings.fontFamily === font.value
                    ? 'border-brand-500 bg-brand-50 shadow-md dark:bg-brand-950/30'
                    : 'border-border hover:border-brand-300 hover:shadow-sm'
                }`}
                style={{ fontFamily: font.stack }}
              >
                <span className="block text-sm font-semibold">{font.label}</span>
                <span className="block mt-1 text-xs text-muted-foreground" style={{ fontFamily: font.stack }}>
                  Aa Bb Cc 123
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Default Theme */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {theme === 'dark' ? <Moon className="h-4 w-4 text-brand-500" /> : <Sun className="h-4 w-4 text-brand-500" />}
            Default Theme
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleDefaultThemeChange('light')}
              className={`group relative rounded-xl border-2 p-4 transition-all cursor-pointer ${
                settings.defaultTheme === 'light'
                  ? 'border-brand-500 shadow-md'
                  : 'border-border hover:border-brand-300 hover:shadow-sm'
              }`}
            >
              <div className="mb-3 flex items-center gap-2">
                <Sun className="h-5 w-5 text-amber-500" />
                <span className="font-semibold">Light Mode</span>
              </div>
              <div className="space-y-1.5 rounded-lg bg-gray-50 p-3 dark:bg-gray-200">
                <div className="h-2 w-3/4 rounded bg-gray-300" />
                <div className="h-2 w-1/2 rounded bg-gray-200" />
                <div className="flex gap-1.5 pt-1">
                  <div className="h-4 w-4 rounded bg-blue-400" />
                  <div className="h-4 flex-1 rounded bg-gray-200" />
                </div>
              </div>
              {settings.defaultTheme === 'light' && (
                <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
            </button>

            <button
              onClick={() => handleDefaultThemeChange('dark')}
              className={`group relative rounded-xl border-2 p-4 transition-all cursor-pointer ${
                settings.defaultTheme === 'dark'
                  ? 'border-brand-500 shadow-md'
                  : 'border-border hover:border-brand-300 hover:shadow-sm'
              }`}
            >
              <div className="mb-3 flex items-center gap-2">
                <Moon className="h-5 w-5 text-indigo-400" />
                <span className="font-semibold">Dark Mode</span>
              </div>
              <div className="space-y-1.5 rounded-lg bg-gray-800 p-3">
                <div className="h-2 w-3/4 rounded bg-gray-600" />
                <div className="h-2 w-1/2 rounded bg-gray-700" />
                <div className="flex gap-1.5 pt-1">
                  <div className="h-4 w-4 rounded bg-blue-500" />
                  <div className="h-4 flex-1 rounded bg-gray-700" />
                </div>
              </div>
              {settings.defaultTheme === 'dark' && (
                <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
