export default function DeliveryPromoCarousel({
  slides,
  carouselRef,
  currentSlide,
  onMouseDown,
  onSlideSelect,
  onSlideAction,
}) {
  if (!slides?.length) return null

  return (
    <div
      ref={carouselRef}
      className="relative overflow-hidden bg-gray-700 cursor-grab active:cursor-grabbing select-none flex-shrink-0"
      style={{ touchAction: "pan-y" }}
      onMouseDown={onMouseDown}
    >
      <div
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {slides.map((slide) => (
          <div key={slide.id} className="min-w-full">
            <div className={`${slide.bgColor} px-4 py-3 flex items-center gap-3 min-h-[80px]`}>
              <div className="flex-shrink-0">
                {slide.icon === "bag" ? (
                  <div className="relative">
                    <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center shadow-lg relative">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-black/30 rounded-full blur-sm" />
                  </div>
                ) : (
                  <div className="relative w-10 h-10">
                    <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center relative">
                      <svg className="w-12 h-12 text-white absolute" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h3 className={`${slide.bgColor === "bg-gray-700" ? "text-white" : "text-black"} text-sm font-semibold mb-0.5`}>
                  {slide.title}
                </h3>
                <p className={`${slide.bgColor === "bg-gray-700" ? "text-white/90" : "text-black/80"} text-xs`}>
                  {slide.subtitle}
                </p>
              </div>

              <button
                onClick={() => {
                  if (slide.actionPath) {
                    onSlideAction(slide.actionPath)
                  }
                }}
                className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-colors ${
                  slide.bgColor === "bg-gray-700"
                    ? "bg-gray-600 text-white hover:bg-gray-500"
                    : "bg-yellow-300 text-black hover:bg-yellow-200"
                }`}
              >
                {slide.buttonText}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => onSlideSelect(index)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === currentSlide
                ? currentSlide === 0
                  ? "w-6 bg-white"
                  : "w-6 bg-black"
                : index === 0
                  ? "w-1.5 bg-white/50"
                  : "w-1.5 bg-black/30"
            }`}
          />
        ))}
      </div>
    </div>
  )
}
