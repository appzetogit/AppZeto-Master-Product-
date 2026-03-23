$paths = @(
    "c:\Users\k\Desktop\Appzeto-Master1\frontend\src\modules\Food\pages\admin\reports\FoodReport.jsx",
    "c:\Users\k\Desktop\Appzeto-Master1\frontend\src\modules\Food\pages\admin\reports\RestaurantReport.jsx"
)

$new_func = '  const renderStars = (rating, reviews) => {
    const fullStars = Math.floor(rating || 0);
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            className={`w-3.5 h-3.5 ${i < fullStars ? "fill-yellow-400 text-yellow-400" : "text-slate-300"}`} 
          />
        ))}
        <span className="ml-1 text-slate-600">({reviews || 0})</span>
      </div>
    )
  }'

foreach ($path in $paths) {
    if (Test-Path $path) {
        $content = Get-Content -Path $path -Raw
        $new_content = $content -replace ''(?s)const renderStars = \(rating, reviews\) => \{[\s\S]*?(\n  \})'', $new_func
        $new_content | Set-Content -Path $path -Encoding UTF8
    }
}
