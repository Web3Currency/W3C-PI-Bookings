from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def replace(path, old, new, count=1):
    p = ROOT / path
    s = p.read_text(encoding='utf-8')
    if old not in s:
        raise SystemExit(f'Missing expected text in {path}: {old[:120]!r}')
    p.write_text(s.replace(old, new, count), encoding='utf-8')

# Hide header Become a Provider action; onboarding remains in the side menu.
replace('artifacts/pibooking/src/components/Navbar.tsx', "{!hasProvider && onOpenBecomeProvider && <button onClick={onOpenBecomeProvider} id=\"btn-nav-become-provider\" title=\"Become a Provider\" className=\"px-3.5 py-1.5 rounded-full bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition shadow-xs cursor-pointer\">Become a Provider</button>}", '')

# Remove legacy full-description wiring from the general service reader/writer.
p = ROOT / 'artifacts/pibooking/src/services/serviceService.ts'
s = p.read_text(encoding='utf-8')
s = s.replace("        fullDescription: row.full_description || row.short_description || '',\n", '')
s = s.replace("          full_description: newService.fullDescription || '',\n", '')
s = s.replace("        if (updates.fullDescription !== undefined) payload.full_description = updates.fullDescription;\n", '')
p.write_text(s, encoding='utf-8')

# Provider media service supports service covers as a distinct storage kind.
p = ROOT / 'artifacts/pibooking/src/services/providerMediaService.ts'
s = p.read_text(encoding='utf-8')
s = s.replace("type: 'profile' | 'portfolio' | 'service_cover'", "type: 'profile' | 'portfolio' | 'service_cover'")
p.write_text(s, encoding='utf-8')

# Remove attachment rendering/imports from booking summary robustly.
p = ROOT / 'artifacts/pibooking/src/components/BookingSummaryStep.tsx'
s = p.read_text(encoding='utf-8')
s = re.sub(r"\ninterface AttachedFile \{.*?\n\}\n", "\n", s, count=1, flags=re.S)
s = s.replace("    attachments?: AttachedFile[];\n", '')
s = re.sub(r"\n            \{\/\* Attached Files \*\/\}.*?\n            \)\}", "", s, count=1, flags=re.S)
p.write_text(s, encoding='utf-8')

# Ensure no obsolete attachment state remains in the application-level booking details type.
p = ROOT / 'artifacts/pibooking/src/App.tsx'
s = p.read_text(encoding='utf-8')
s = s.replace("  const [clientDetails, setClientDetails] = useState<ClientDetails>({clientName:'',clientPiUsername:'',clientPhone:'',clientEmail:'',notes:'',attachments:[]});", "  const [clientDetails, setClientDetails] = useState<ClientDetails>({clientName:'',clientPiUsername:'',clientPhone:'',clientEmail:'',notes:''});")
p.write_text(s, encoding='utf-8')

# Delete temporary automation files from the final branch.
for path in ['scripts/apply_provider_service_refinements.py', 'scripts/finalize_provider_refinements.py', '.github/workflows/apply-refinements.yml']:
    p = ROOT / path
    if p.exists(): p.unlink()
