"use client";

import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
    value?: string | null;
    onChange: (color: string) => void;
}

const PRESET_COLOR = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#FED766", "#2D728F",
    "#F4A261", "#E76F51", "#2A9D8F", "#264653", "#E9C46A",
    "#8E9AAF", "#CBC0D3", "#EFD3D7", "#FEEAFA", "#DEE2FF",
];

export function ColorPicker({ value, onChange }: ColorPickerProps) {
    return (
        <div>
            <Tabs defaultValue="presets" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="presets">Cores Padrão</TabsTrigger>
                    <TabsTrigger value="hex">Hexadecimal</TabsTrigger>
                </TabsList>
            <TabsContent value="presets">
                    <div className="grid grid-cols-5 gap-2 py-4">
                        {PRESET_COLOR.map((color) => (
                            <button
                                key={color}
                                type="button"
                                className={cn(
                                    "h-8 w-8 rounded-full border-2 transition-transform hover:scale-110",
                                    value?.toUpperCase() === color.toUpperCase()
                                        ? "border-primary ring-2 ring-ring ring-offset-2"
                                        : "border-transparent"
                                )}
                                style={{ backgroundColor: color }}
                                onClick={() => onChange(color)}
                            />
                        ))}
                    </div>
                </TabsContent>
                <TabsContent value="hex">
                    <div className="flex items-center gap-2 py-4">
                        <div
                            className="h-8 w-8 rounded-full border"
                            style={{ backgroundColor: value ?? "#FFFFFF" }}
                        />
                        <Input
                            value={value ?? ""}
                            onChange={(e) => onChange(e.currentTarget.value)}
                            placeholder="#FFFFFF"
                        />
                    </div>
                </TabsContent>
            </Tabs>
            {value && (
                <button 
                    type="button"
          onClick={() => onChange("")} // Limpa a seleção
                    className="text-xs text-muted-foreground hover:text-primary mt-2"
                >
                    Limpar cor
                </button>
            )}
        </div>
    );
}