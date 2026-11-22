# Carte des écrans

L'application ne compte qu'une vue principale (globe) et sept panneaux secondaires. Aucun panneau ne remplace la vue : ils se superposent et un seul est ouvert à la fois.

## Vue principale

```
┌──────────────────────────────────────────┐
│ brand        [ indicateur ]      actions │
│ dimensions / libellés / épiques          │
│                                          │
│              GLOBE 3D                    │
│                                          │
│  fiche région        readout / nav       │
├──────────────────────────────────────────┤
│              FRISE CHRONOLOGIQUE          │
│  épiques · ères · année · siècles · minimap│
└──────────────────────────────────────────┘
```

## Panneaux

| Déclencheur | Panneau | Contenu |
|---|---|---|
| `❖` / `T` | Récits | 10 parcours, filtres difficulté/thème, étapes |
| `✧` / `L` | Apprendre | 6 onglets : année, carte muette, progression, objectifs, à trous, profil |
| `⚑` | Qualité des données | 12 extraits d'anomalies |
| `A/B` / `A` | Comparaison | deux années, presets, barres de delta |
| frise `Histomap` / `H` | Histomap | streamgraph, minimap, table miroir |
| `☷` | Affichage | couleurs, libellés, épiques, outils, historique |
| `?` | Aide | raccourcis clavier |

Le bandeau de premier lancement est non modal ; il se ferme après trois étapes ou avec « Passer ».

Captures correspondantes : `docs/harness/captures/`.
