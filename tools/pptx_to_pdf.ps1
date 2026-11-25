# Convert a .pptx to .pdf with PowerPoint, and report tables that overflow the page.
# Usage: powershell -File tools\pptx_to_pdf.ps1 -Pptx <path to .pptx>
param([Parameter(Mandatory = $true)][string]$Pptx)

$src = (Resolve-Path -LiteralPath $Pptx).Path
$pdf = [IO.Path]::ChangeExtension($src, '.pdf')

# Reuse a running PowerPoint if the user has one open (then do not quit it).
$wasRunning = [bool](Get-Process POWERPNT -ErrorAction SilentlyContinue)
$app = New-Object -ComObject PowerPoint.Application
try {
    $doc = $app.Presentations.Open($src, -1, 0, 0)   # ReadOnly, no window
    # Bottom edge of every table in points (A4 height = 842pt, footer starts near 819pt)
    $worst = 0
    foreach ($slide in $doc.Slides) {
        foreach ($shape in $slide.Shapes) {
            if ($shape.HasTable) {
                $bottom = $shape.Top + $shape.Height
                if ($bottom -gt $worst) { $worst = $bottom }
                if ($bottom -gt 819) { "OVERFLOW slide $($slide.SlideIndex): bottom=$([int]$bottom)pt" }
            }
        }
    }
    $doc.SaveAs($pdf, 32)   # 32 = ppSaveAsPDF
    "slides=$($doc.Slides.Count) lowestTableBottom=$([int]$worst)pt"
    $doc.Close()
}
finally {
    if (-not $wasRunning) { $app.Quit() }
}
