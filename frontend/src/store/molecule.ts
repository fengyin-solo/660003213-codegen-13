import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MoleculeData, ADMETProps, PharmacophoreData, PharmacophoreFeature, PharmacophoreType } from '../types'

const ATOM_COLORS: Record<string, string> = {
  C: '#6b7280', N: '#3b82f6', O: '#ef4444', S: '#eab308',
  P: '#f97316', H: '#e5e7eb', F: '#22c55e', Cl: '#16a34a',
  Br: '#7c2d12', I: '#8b5cf6', Na: '#ec4899', K: '#a855f7'
}

const ATOM_RADII: Record<string, number> = {
  C: 0.3, N: 0.25, O: 0.22, S: 0.35, P: 0.35,
  H: 0.15, F: 0.18, Cl: 0.3, Br: 0.35, I: 0.4
}

const PHARMACOPHORE_COLORS: Record<PharmacophoreType, string> = {
  hbond_donor: '#22c55e',
  hbond_acceptor: '#ef4444',
  hydrophobic: '#f59e0b',
  aromatic: '#8b5cf6',
  positive_charge: '#3b82f6',
  negative_charge: '#ec4899'
}

const PHARMACOPHORE_NAMES: Record<PharmacophoreType, string> = {
  hbond_donor: '氢键供体',
  hbond_acceptor: '氢键受体',
  hydrophobic: '疏水基团',
  aromatic: '芳香环',
  positive_charge: '正电荷中心',
  negative_charge: '负电荷中心'
}

const PHARMACOPHORE_DESCRIPTIONS: Record<PharmacophoreType, string> = {
  hbond_donor: '能够提供氢原子形成氢键的基团，如羟基、氨基等',
  hbond_acceptor: '能够接受氢原子形成氢键的基团，如羰基、醚氧等',
  hydrophobic: '不溶于水的非极性基团，如烷基、芳环等',
  aromatic: '具有芳香性的环状结构，如苯环、吡啶环等',
  positive_charge: '带正电荷的官能团，如氨基、胍基等',
  negative_charge: '带负电荷的官能团，如羧基、磷酸基等'
}

const PHARMACOPHORE_DIRECTIONS: Record<PharmacophoreType, string> = {
  hbond_donor: '沿 N-H/O-H 键方向向外',
  hbond_acceptor: '沿孤对电子方向向内',
  hydrophobic: '从基团中心向外辐射',
  aromatic: '垂直于环平面方向',
  positive_charge: '从正电荷中心向外发散',
  negative_charge: '向负电荷中心汇聚'
}

function parseSMILES(smiles: string): { atoms: any[]; bonds: any[] } {
  const atoms: any[] = []
  const bonds: any[] = []
  const stack: number[] = []
  let lastAtom = -1
  let pendingBond = 1
  let i = 0

  while (i < smiles.length) {
    const ch = smiles[i]
    if (ch === '(') { stack.push(lastAtom) }
    else if (ch === ')') { stack.pop() }
    else if (ch === '[') {
      let el = ''
      i++
      while (i < smiles.length && smiles[i] !== ']') { el += smiles[i]; i++ }
      const element = el.replace(/[^A-Za-z]/g, '').charAt(0).toUpperCase() + el.replace(/[^A-Za-z]/g, '').slice(1).toLowerCase()
      atoms.push({ element, x: (atoms.length % 3 - 1) * 1.5, y: (Math.floor(atoms.length / 3) % 3 - 1) * 1.5, z: (Math.floor(atoms.length / 9) - 1) * 1.5, color: ATOM_COLORS[element] || '#888', radius: ATOM_RADII[element] || 0.25 })
      if (lastAtom >= 0) bonds.push({ atom1: lastAtom, atom2: atoms.length - 1, order: pendingBond })
      lastAtom = atoms.length - 1
      pendingBond = 1
    }
    else if (ch === '=') { pendingBond = 2 }
    else if (ch === '#') { pendingBond = 3 }
    else if (ch === '-') { pendingBond = 1 }
    else if (/[A-Z]/.test(ch)) {
      let element = ch
      if (i + 1 < smiles.length && /[a-z]/.test(smiles[i + 1])) { element += smiles[i + 1]; i++ }
      atoms.push({ element, x: (atoms.length % 3 - 1) * 1.5 + Math.random() * 0.5, y: (Math.floor(atoms.length / 3) % 3 - 1) * 1.5 + Math.random() * 0.5, z: (Math.floor(atoms.length / 9) - 1) * 1.5 + Math.random() * 0.5, color: ATOM_COLORS[element] || '#888', radius: ATOM_RADII[element] || 0.25 })
      if (lastAtom >= 0) bonds.push({ atom1: lastAtom, atom2: atoms.length - 1, order: pendingBond })
      lastAtom = atoms.length - 1
      pendingBond = 1
    }
    i++
  }
  return { atoms, bonds }
}

const MOCK_MOLECULES: Omit<MoleculeData, 'atoms' | 'bonds'>[] = [
  { id: 1, name: '阿司匹林', smiles: 'CC(=O)Oc1ccccc1C(=O)O', formula: 'C9H8O4', mw: 180.16, logP: 1.19, category: '解热镇痛' },
  { id: 2, name: '布洛芬', smiles: 'CC(C)Cc1ccc(cc1)C(C)C(=O)O', formula: 'C13H18O2', mw: 206.28, logP: 3.97, category: '解热镇痛' },
  { id: 3, name: '青霉素G', smiles: 'CC1(C)SC2C(NC(=O)Cc3ccccc3)C(=O)N2C1C(=O)O', formula: 'C16H18N2O4S', mw: 334.39, logP: 1.83, category: '抗生素' },
  { id: 4, name: '咖啡因', smiles: 'Cn1c(=O)c2c(ncn2C)n(C)c1=O', formula: 'C8H10N4O2', mw: 194.19, logP: -0.07, category: '中枢神经' },
  { id: 5, name: '二甲双胍', smiles: 'CN(C)C(=N)N=C(N)N', formula: 'C4H11N5', mw: 129.16, logP: -1.43, category: '降糖药' },
  { id: 6, name: '阿莫西林', smiles: 'CC1(C)SC2C(NC(=O)Cc3ccccc3)C(=O)N2C1C(=O)NCc4ccc(O)c(O)c4', formula: 'C16H19N3O5S', mw: 365.4, logP: 0.87, category: '抗生素' },
  { id: 7, name: '扑热息痛', smiles: 'CC(=O)Nc1ccc(O)cc1', formula: 'C8H9NO2', mw: 151.16, logP: 0.46, category: '解热镇痛' },
  { id: 8, name: '维生素C', smiles: 'OCC(O)C1OC(=O)C(O)=C1O', formula: 'C6H8O6', mw: 176.12, logP: -2.41, category: '维生素' },
  { id: 9, name: '地西泮', smiles: 'Clc1ccc(N2C(=O)CN=C(c3ccccc3)c3cc(Cl)ccc32)cc1', formula: 'C16H13ClN2O', mw: 284.74, logP: 2.82, category: '中枢神经' },
  { id: 10, name: '奥美拉唑', smiles: 'COc1ccc2[nH]c(nc2c1)S(=O)Cc1ncc(C)c(OC)c1C', formula: 'C17H19N3O3S', mw: 345.41, logP: 1.17, category: '消化系统' },
  { id: 11, name: '阿替洛尔', smiles: 'CC(C)NCC(O)COc1ccc2CCNC(=O)c2c1', formula: 'C14H22N2O3', mw: 266.34, logP: 0.5, category: '心血管' },
  { id: 12, name: '头孢氨苄', smiles: 'CC1=C(C(=O)NC(=O)C1SCC2=C(C(=C(N2)C(=O)O)N)C)c3ccc(O)cc3', formula: 'C16H17N3O4S', mw: 347.39, logP: -0.53, category: '抗生素' },
  { id: 13, name: '辛伐他汀', smiles: 'CCC(C)C1C(=O)C2C(C1(C)C)CCC3=C(C2)C(C4=CC(=CC=C4)F)O3', formula: 'C25H38O5', mw: 418.57, logP: 4.68, category: '降脂药' },
  { id: 14, name: '西咪替丁', smiles: 'NC(=N)NCCSCc1nc(C)c(C)n1', formula: 'C10H16N6S', mw: 252.34, logP: -0.2, category: '消化系统' },
  { id: 15, name: '硝苯地平', smiles: 'COC(=O)C1=C(C)NC(C)=C(C(=O)OC)C1c1ccccc1[N+](=O)[O-]', formula: 'C17H18N2O6', mw: 346.34, logP: 2.2, category: '心血管' },
  { id: 16, name: '美托洛尔', smiles: 'COCC(O)CNC(C)Cc1ccc(OCC)cc1', formula: 'C15H25NO3', mw: 267.36, logP: 1.88, category: '心血管' },
  { id: 17, name: '雷尼替丁', smiles: 'CN(C)/C=N/CCSCc1c[nH]c(=O)n1', formula: 'C13H22N4O3S', mw: 314.4, logP: 0.27, category: '消化系统' },
  { id: 18, name: '氟西汀', smiles: 'CNCCC(Oc1ccc(F)cc1)c1ccccc1', formula: 'C17H18FNO', mw: 271.33, logP: 4.05, category: '中枢神经' },
  { id: 19, name: '吉非罗齐', smiles: 'CC(C)c1ccc(C(=O)OC(CCO)C(C)C)cc1', formula: 'C15H22O3', mw: 250.33, logP: 4.77, category: '降脂药' },
  { id: 20, name: '卡托普利', smiles: 'CCC(C)C(C(=O)O)NC(=O)CCS', formula: 'C9H15NO3S', mw: 217.29, logP: -0.5, category: '心血管' }
]

export function computeADMET(mol: { mw: number; logP: number; formula: string }): ADMETProps {
  const { mw, logP } = mol
  const logS = 0.5 - 0.01 * (mw - 20) - logP
  const hbd = (mol.formula.match(/O/g) || []).length
  const hba = (mol.formula.match(/N/g) || []).length + hbd
  const violations = (mw > 500 ? 1 : 0) + (logP > 5 ? 1 : 0) + (hbd > 5 ? 1 : 0) + (hba > 10 ? 1 : 0)
  const toxicity = logP > 3 ? '高毒性风险' : logP > 1 ? '中等毒性' : '低毒性'
  const proteinBinding = Math.min(99, Math.max(10, Math.round(logP * 15 + 30)))
  const metabolicStability = mw < 300 ? '稳定' : mw < 450 ? '中等' : '不稳定'
  const bioavailability = Math.max(0, Math.min(100, Math.round(100 - logP * 8 - mw * 0.05)))

  return {
    logP: Math.round(logP * 100) / 100,
    logS: Math.round(logS * 100) / 100,
    toxicity,
    proteinBinding,
    metabolicStability,
    bioavailability,
    ruleOfFive: violations <= 1,
    violations
  }
}

function findAromaticRings(atoms: any[], bonds: any[]): number[][] {
  const adjacency: number[][] = atoms.map(() => [])
  bonds.forEach(bond => {
    adjacency[bond.atom1].push(bond.atom2)
    adjacency[bond.atom2].push(bond.atom1)
  })

  const rings: number[][] = []
  const visited = new Set<number>()

  function dfs(node: number, start: number, path: number[], depth: number) {
    if (depth > 6) return
    if (node === start && depth >= 3) {
      const ring = [...path].sort((a, b) => a - b)
      const ringKey = ring.join(',')
      if (!rings.some(r => r.join(',') === ringKey) && path.length >= 5 && path.length <= 7) {
        rings.push([...path])
      }
      return
    }
    if (visited.has(node)) return

    visited.add(node)
    path.push(node)

    for (const neighbor of adjacency[node]) {
      if (neighbor === start && path.length >= 3) {
        dfs(neighbor, start, [...path], depth + 1)
      } else if (!visited.has(neighbor)) {
        dfs(neighbor, start, [...path], depth + 1)
      }
    }

    visited.delete(node)
    path.pop()
  }

  for (let i = 0; i < atoms.length; i++) {
    if (atoms[i].element === 'C' || atoms[i].element === 'N') {
      visited.clear()
      dfs(i, i, [], 0)
    }
  }

  const aromaticRings: number[][] = []
  rings.forEach(ring => {
    const hasCarbon = ring.some(idx => atoms[idx]?.element === 'C')
    const size = ring.length
    if (hasCarbon && size >= 5 && size <= 7) {
      aromaticRings.push(ring)
    }
  })

  return aromaticRings
}

export function computePharmacophore(mol: { atoms: any[]; bonds: any[]; formula: string; smiles: string }): PharmacophoreData {
  const features: PharmacophoreFeature[] = []
  let featureId = 0

  const oxygenIndices: number[] = []
  const nitrogenIndices: number[] = []
  const sulfurIndices: number[] = []
  const carbonIndices: number[] = []
  const fluorineIndices: number[] = []
  const chlorineIndices: number[] = []
  const bromineIndices: number[] = []

  mol.atoms.forEach((atom, idx) => {
    if (atom.element === 'O') oxygenIndices.push(idx)
    else if (atom.element === 'N') nitrogenIndices.push(idx)
    else if (atom.element === 'S') sulfurIndices.push(idx)
    else if (atom.element === 'C') carbonIndices.push(idx)
    else if (atom.element === 'F') fluorineIndices.push(idx)
    else if (atom.element === 'Cl') chlorineIndices.push(idx)
    else if (atom.element === 'Br') bromineIndices.push(idx)
  })

  const adjacency: number[][] = mol.atoms.map(() => [])
  mol.bonds.forEach(bond => {
    adjacency[bond.atom1].push(bond.atom2)
    adjacency[bond.atom2].push(bond.atom1)
  })

  oxygenIndices.forEach(idx => {
    const neighbors = adjacency[idx]
    const hasHydrogenNeighbor = neighbors.some(n => mol.atoms[n]?.element === 'H')
    const isDonor = hasHydrogenNeighbor || mol.smiles.includes('O)') || mol.smiles.includes('OH')

    if (isDonor) {
      features.push({
        id: `feat_${featureId++}`,
        type: 'hbond_donor',
        name: PHARMACOPHORE_NAMES.hbond_donor,
        description: PHARMACOPHORE_DESCRIPTIONS.hbond_donor,
        actionDirection: PHARMACOPHORE_DIRECTIONS.hbond_donor,
        color: PHARMACOPHORE_COLORS.hbond_donor,
        atomIndices: [idx],
        importance: 'high'
      })
    }

    features.push({
      id: `feat_${featureId++}`,
      type: 'hbond_acceptor',
      name: PHARMACOPHORE_NAMES.hbond_acceptor,
      description: PHARMACOPHORE_DESCRIPTIONS.hbond_acceptor,
      actionDirection: PHARMACOPHORE_DIRECTIONS.hbond_acceptor,
      color: PHARMACOPHORE_COLORS.hbond_acceptor,
      atomIndices: [idx],
      importance: 'high'
    })
  })

  nitrogenIndices.forEach(idx => {
    const neighbors = adjacency[idx]
    const hasHydrogenNeighbor = neighbors.some(n => mol.atoms[n]?.element === 'H')

    if (hasHydrogenNeighbor) {
      features.push({
        id: `feat_${featureId++}`,
        type: 'hbond_donor',
        name: PHARMACOPHORE_NAMES.hbond_donor,
        description: PHARMACOPHORE_DESCRIPTIONS.hbond_donor,
        actionDirection: PHARMACOPHORE_DIRECTIONS.hbond_donor,
        color: PHARMACOPHORE_COLORS.hbond_donor,
        atomIndices: [idx],
        importance: 'medium'
      })
    }

    features.push({
      id: `feat_${featureId++}`,
      type: 'hbond_acceptor',
      name: PHARMACOPHORE_NAMES.hbond_acceptor,
      description: PHARMACOPHORE_DESCRIPTIONS.hbond_acceptor,
      actionDirection: PHARMACOPHORE_DIRECTIONS.hbond_acceptor,
      color: PHARMACOPHORE_COLORS.hbond_acceptor,
      atomIndices: [idx],
      importance: 'medium'
    })
  })

  const aromaticRings = findAromaticRings(mol.atoms, mol.bonds)
  aromaticRings.forEach((ring, ringIdx) => {
    features.push({
      id: `feat_${featureId++}`,
      type: 'aromatic',
      name: `${PHARMACOPHORE_NAMES.aromatic} ${ringIdx + 1}`,
      description: PHARMACOPHORE_DESCRIPTIONS.aromatic,
      actionDirection: PHARMACOPHORE_DIRECTIONS.aromatic,
      color: PHARMACOPHORE_COLORS.aromatic,
      atomIndices: ring,
      importance: 'high'
    })
  })

  const hydrophobicAtoms = [
    ...carbonIndices.filter(idx => {
      const neighbors = adjacency[idx]
      const hasOnlyCarbonOrHydrogen = neighbors.every(n => {
        const el = mol.atoms[n]?.element
        return el === 'C' || el === 'H'
      })
      return hasOnlyCarbonOrHydrogen
    }),
    ...fluorineIndices,
    ...chlorineIndices,
    ...bromineIndices,
    ...sulfurIndices
  ]

  if (hydrophobicAtoms.length > 0) {
    const chunks: number[][] = []
    const visitedHydro = new Set<number>()

    hydrophobicAtoms.forEach(atomIdx => {
      if (visitedHydro.has(atomIdx)) return

      const chunk: number[] = []
      const queue = [atomIdx]
      visitedHydro.add(atomIdx)

      while (queue.length > 0) {
        const current = queue.shift()!
        chunk.push(current)

        adjacency[current].forEach(neighbor => {
          if (hydrophobicAtoms.includes(neighbor) && !visitedHydro.has(neighbor)) {
            visitedHydro.add(neighbor)
            queue.push(neighbor)
          }
        })
      }

      if (chunk.length >= 2) {
        chunks.push(chunk)
      }
    })

    chunks.forEach((chunk, chunkIdx) => {
      features.push({
        id: `feat_${featureId++}`,
        type: 'hydrophobic',
        name: `${PHARMACOPHORE_NAMES.hydrophobic} ${chunkIdx + 1}`,
        description: PHARMACOPHORE_DESCRIPTIONS.hydrophobic,
        actionDirection: PHARMACOPHORE_DIRECTIONS.hydrophobic,
        color: PHARMACOPHORE_COLORS.hydrophobic,
        atomIndices: chunk,
        importance: chunk.length > 4 ? 'high' : 'medium'
      })
    })
  }

  const positiveChargePatterns = [
    { pattern: /\[N\+\]/g, importance: 'high' as const },
    { pattern: /NC\(=N\)N/g, importance: 'high' as const },
    { pattern: /CN\(C\)/g, importance: 'medium' as const }
  ]

  positiveChargePatterns.forEach(({ pattern, importance }) => {
    const matches = mol.smiles.match(pattern)
    if (matches) {
      matches.forEach(() => {
        const nIdx = nitrogenIndices.shift()
        if (nIdx !== undefined) {
          features.push({
            id: `feat_${featureId++}`,
            type: 'positive_charge',
            name: PHARMACOPHORE_NAMES.positive_charge,
            description: PHARMACOPHORE_DESCRIPTIONS.positive_charge,
            actionDirection: PHARMACOPHORE_DIRECTIONS.positive_charge,
            color: PHARMACOPHORE_COLORS.positive_charge,
            atomIndices: [nIdx],
            importance
          })
        }
      })
    }
  })

  const negativeChargePatterns = [
    { pattern: /C\(=O\)O/g, importance: 'high' as const },
    { pattern: /\[O-\]/g, importance: 'high' as const },
    { pattern: /S\(=O\)/g, importance: 'medium' as const }
  ]

  negativeChargePatterns.forEach(({ pattern, importance }) => {
    const matches = mol.smiles.match(pattern)
    if (matches) {
      matches.forEach(() => {
        const oIdx = oxygenIndices.shift()
        if (oIdx !== undefined) {
          features.push({
            id: `feat_${featureId++}`,
            type: 'negative_charge',
            name: PHARMACOPHORE_NAMES.negative_charge,
            description: PHARMACOPHORE_DESCRIPTIONS.negative_charge,
            actionDirection: PHARMACOPHORE_DIRECTIONS.negative_charge,
            color: PHARMACOPHORE_COLORS.negative_charge,
            atomIndices: [oIdx],
            importance
          })
        }
      })
    }
  })

  const typeCounts: Record<PharmacophoreType, number> = {
    hbond_donor: 0,
    hbond_acceptor: 0,
    hydrophobic: 0,
    aromatic: 0,
    positive_charge: 0,
    negative_charge: 0
  }

  features.forEach(f => {
    typeCounts[f.type]++
  })

  const summary = `该分子包含 ${features.length} 个药效团特征：` +
    `${typeCounts.hbond_donor > 0 ? typeCounts.hbond_donor + '个氢键供体、' : ''}` +
    `${typeCounts.hbond_acceptor > 0 ? typeCounts.hbond_acceptor + '个氢键受体、' : ''}` +
    `${typeCounts.hydrophobic > 0 ? typeCounts.hydrophobic + '个疏水基团、' : ''}` +
    `${typeCounts.aromatic > 0 ? typeCounts.aromatic + '个芳香环、' : ''}` +
    `${typeCounts.positive_charge > 0 ? typeCounts.positive_charge + '个正电中心、' : ''}` +
    `${typeCounts.negative_charge > 0 ? typeCounts.negative_charge + '个负电中心、' : ''}`

  return {
    features,
    summary: summary.replace(/、$/, '')
  }
}

export const useMoleculeStore = defineStore('molecule', () => {
  const molecules = ref<MoleculeData[]>([])
  const currentMolecule = ref<MoleculeData | null>(null)
  const admet = ref<ADMETProps | null>(null)
  const pharmacophore = ref<PharmacophoreData | null>(null)
  const highlightedFeatureId = ref<string | null>(null)
  const searchQuery = ref('')
  const searchResults = ref<MoleculeData[]>([])
  const isLoading = ref(false)

  const filteredMolecules = computed(() => {
    if (!searchQuery.value) return molecules.value
    const q = searchQuery.value.toLowerCase()
    return molecules.value.filter(m => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q) || m.smiles.toLowerCase().includes(q))
  })

  function loadMolecules() {
    molecules.value = MOCK_MOLECULES.map(m => {
      const { atoms, bonds } = parseSMILES(m.smiles)
      return { ...m, atoms, bonds }
    })
    if (molecules.value.length > 0) selectMolecule(molecules.value[0])
  }

  function selectMolecule(mol: MoleculeData) {
    currentMolecule.value = mol
    admet.value = computeADMET({ mw: mol.mw, logP: mol.logP, formula: mol.formula })
    pharmacophore.value = computePharmacophore({ atoms: mol.atoms, bonds: mol.bonds, formula: mol.formula, smiles: mol.smiles })
  }

  function searchMolecules(query: string) {
    searchQuery.value = query
    searchResults.value = filteredMolecules.value
  }

  function setHighlightedFeature(id: string | null) {
    highlightedFeatureId.value = id
  }

  function computeTanimoto(smiles1: string, smiles2: string): number {
    const set1 = new Set(smiles1.split(''))
    const set2 = new Set(smiles2.split(''))
    let intersection = 0
    set1.forEach(s => { if (set2.has(s)) intersection++ })
    const union = set1.size + set2.size - intersection
    return union === 0 ? 0 : Math.round((intersection / union) * 1000) / 10
  }

  const similarMolecules = computed(() => {
    if (!currentMolecule.value) return []
    return molecules.value
      .map(m => ({ ...m, similarity: computeTanimoto(currentMolecule.value!.smiles, m.smiles) }))
      .filter(m => m.id !== currentMolecule.value!.id)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)
  })

  return {
    molecules, currentMolecule, admet, pharmacophore, highlightedFeatureId,
    searchQuery, searchResults, isLoading,
    filteredMolecules, similarMolecules,
    loadMolecules, selectMolecule, searchMolecules, setHighlightedFeature
  }
})
