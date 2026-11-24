#!/usr/bin/env python3
"""Balayage du gate de design sur tous les états de l'app Vectemporel.

Réutilise les contrôles canoniques du harnais universel (apple_design_audit.py) :
aucune règle n'est réimplémentée ici. Chaque état est ouvert dans une page propre,
éventuellement pilotée par ses boutons, puis mesuré aux deux viewports imposés.
"""
import argparse
import importlib.util
import json
import subprocess
import sys
import time
from pathlib import Path

AUDIT = Path('/home/tasour/.config/opencode/skills/apple-design-gates/scripts/apple_design_audit.py')
spec = importlib.util.spec_from_file_location('apple_design_audit', AUDIT)
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)

VIEWPORTS = [(1658, 1150), (390, 844)]

# (nom, deep link, actions JS dans la page)
STATES = [
    ('globe', '', []),
    ('affichage', '', ["document.getElementById('hud-display-button').click()"]),
    ('recherche', '', ["document.getElementById('hud-search-button').click()"]),
    ('aide', '', ["document.getElementById('hud-help-button').click()"]),
    ('annee', '', ["document.getElementById('timeline-year').click()"]),
    ('revision', '', ["document.getElementById('hud-review-button').click()"]),
    ('recits-guides', '', ["document.getElementById('hud-trails-button').click()"]),
    ('apprendre', '', ["document.getElementById('hud-learn-button').click()"]),
    ('qualite', '', ["document.getElementById('hud-quality-button').click()"]),
    ('tiroir-ruptures', '', ["document.getElementById('timeline-turning').click()"]),
    ('comparaison', '', ["document.getElementById('hud-compare-button').click()"]),
    ('fiche-province', '', ["window.VATLAS.setYear(1000); window.VATLAS.selectRegion('Dauphiné')"]),
    ('histomap', '?histomap=1', []),
    ('histographie', '?histography=1', []),
    ('histographie-recits', '?histography=1', ["document.getElementById('histo-mode').click()"]),
    ('rapport-dauphine', '?report=dauphine', []),
    ('rapport-catholicisme', '?report=catholicisme', []),
    ('sujet-dauphine', '?subject=dauphine', []),
    ('sujet-recits', '?subject=dauphine', ["document.querySelector('.subject-mode').click()"]),
    ('trail', '?trail=soie&step=2', []),
    ('arcs', '?arcs=1', []),
    ('soleil', '?sun=1', []),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--url', default='http://127.0.0.1:4244/index.html')
    ap.add_argument('--json', default='')
    ap.add_argument('--fail-on', default='P2', choices=['P0', 'P1', 'P2'])
    args = ap.parse_args()

    from playwright.sync_api import sync_playwright

    findings = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                                     args=['--no-sandbox', '--disable-dev-shm-usage'])
        for name, query, actions in STATES:
            for width, height in VIEWPORTS:
                ctx = browser.new_context(viewport={'width': width, 'height': height})
                pg = ctx.new_page()
                pg.goto(args.url + query, wait_until='load', timeout=60000)
                if 'subject=' in query:
                    pg.wait_for_selector('.subject-canvas canvas', timeout=30000)
                pg.wait_for_timeout(400)
                for action in actions:
                    try:
                        pg.evaluate(action)
                        pg.wait_for_timeout(250)
                    except Exception as exc:
                        item = audit.finding('R99', 'P1', f'état {name}', action[:60],
                                             'action exécutable', str(exc)[:100])
                        item['viewport'] = f'{width}x{height}'
                        findings.append(item)
                for finding in audit.runtime_rules(pg):
                    finding['viewport'] = f'{width}x{height}'
                    finding['state'] = name
                    findings.append(finding)
                if width == 390:
                    r19 = pg.evaluate(audit.RUNTIME_JS['R19'])
                    if r19['scrollW'] > r19['w']:
                        findings.append(audit.finding('R19', 'P0', 'document mobile', r19,
                                                      '0 débordement', '', f'{width}x{height}'))
                ctx.close()
        browser.close()

    payload = {'version': '2.0.0', 'rulesVersion': audit.UNIVERSAL and 'UNIVERSAL_DESIGN_RULES.md v1.0.0',
               'source': args.url, 'states': len(STATES), 'viewports': [f'{w}x{h}' for w, h in VIEWPORTS],
               'findings': findings,
               'counts': {s: sum(1 for f in findings if f['severity'] == s) for s in ('P0', 'P1', 'P2')}}
    text = json.dumps(payload, indent=1, ensure_ascii=False)
    if args.json:
        Path(args.json).parent.mkdir(parents=True, exist_ok=True)
        Path(args.json).write_text(text, 'utf8')
    print(text)
    limit = audit.SEV_ORDER[args.fail_on]
    return 1 if any(audit.SEV_ORDER[f['severity']] <= limit for f in findings) else 0


if __name__ == '__main__':
    sys.exit(main())
