import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Download, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";

interface ImageModalProps {
    isOpen: boolean;
    onClose: () => void;
    images: string[];
    initialIndex?: number;
}

export default function ImageModal({ isOpen, onClose, images, initialIndex = 0 }: ImageModalProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isZoomed, setIsZoomed] = useState(false);

    const handlePrevious = () => {
        setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
        setIsZoomed(false);
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
        setIsZoomed(false);
    };

    const handleDownload = async () => {
        const url = images[currentIndex];
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `attachment-${currentIndex + 1}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            window.open(url, '_blank');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowLeft') handlePrevious();
        if (e.key === 'ArrowRight') handleNext();
        if (e.key === 'Escape') onClose();
    };

    if (!images || images.length === 0) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent 
                className="max-w-[95vw] md:max-w-[85vw] lg:max-w-[75vw] xl:max-w-[65vw] h-[90vh] p-0 bg-black/95 border-gray-800 overflow-hidden"
                onKeyDown={handleKeyDown}
            >
                {/* Header */}
                <DialogHeader className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 to-transparent">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-white text-sm md:text-base font-medium">
                            Attachment {currentIndex + 1} of {images.length}
                        </DialogTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsZoomed(!isZoomed)}
                                className="text-white hover:bg-white/20 h-8 w-8 md:h-9 md:w-9"
                            >
                                {isZoomed ? <ZoomOut className="w-4 h-4 md:w-5 md:h-5" /> : <ZoomIn className="w-4 h-4 md:w-5 md:h-5" />}
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleDownload}
                                className="text-white hover:bg-white/20 h-8 w-8 md:h-9 md:w-9"
                            >
                                <Download className="w-4 h-4 md:w-5 md:h-5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="text-white hover:bg-white/20 h-8 w-8 md:h-9 md:w-9"
                            >
                                <X className="w-4 h-4 md:w-5 md:h-5" />
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                {/* Main Image Container */}
                <div className="relative w-full h-full flex items-center justify-center">
                    {/* Image */}
                    <div className={`relative w-full h-full flex items-center justify-center p-4 pt-16 pb-20 ${isZoomed ? 'overflow-auto' : 'overflow-hidden'}`}>
                        <img
                            src={images[currentIndex]}
                            alt={`Attachment ${currentIndex + 1}`}
                            className={`
                                ${isZoomed 
                                    ? 'max-w-none cursor-zoom-out' 
                                    : 'max-w-full max-h-full object-contain cursor-zoom-in'
                                }
                                rounded-lg transition-transform duration-300
                            `}
                            style={isZoomed ? { width: '150%', height: 'auto' } : {}}
                            onClick={() => setIsZoomed(!isZoomed)}
                        />
                    </div>

                    {/* Navigation Arrows - Only show if multiple images */}
                    {images.length > 1 && (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handlePrevious}
                                className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 text-white bg-black/50 hover:bg-black/70 h-10 w-10 md:h-12 md:w-12 rounded-full"
                            >
                                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleNext}
                                className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 text-white bg-black/50 hover:bg-black/70 h-10 w-10 md:h-12 md:w-12 rounded-full"
                            >
                                <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                            </Button>
                        </>
                    )}
                </div>

                {/* Thumbnail Strip - Bottom */}
                {images.length > 1 && (
                    <div className="absolute bottom-0 left-0 right-0 z-20 p-3 md:p-4 bg-gradient-to-t from-black/80 to-transparent">
                        <div className="flex justify-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                            {images.map((url, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        setCurrentIndex(index);
                                        setIsZoomed(false);
                                    }}
                                    className={`
                                        relative flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-lg overflow-hidden
                                        transition-all duration-200 
                                        ${currentIndex === index 
                                            ? 'ring-2 ring-primary ring-offset-2 ring-offset-black scale-105' 
                                            : 'opacity-60 hover:opacity-100'
                                        }
                                    `}
                                >
                                    <img
                                        src={url}
                                        alt={`Thumbnail ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}