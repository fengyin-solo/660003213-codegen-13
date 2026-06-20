<template>
  <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
    <h3 class="text-sm font-bold text-slate-400 mb-3">药效团高亮说明</h3>
    
    <div v-if="store.pharmacophore" class="space-y-3">
      <div class="bg-slate-900 rounded p-3 text-sm text-slate-300">
        {{ store.pharmacophore.summary }}
      </div>

      <div class="space-y-2">
        <div
          v-for="feature in store.pharmacophore.features"
          :key="feature.id"
          @mouseenter="handleHover(feature.id)"
          @mouseleave="handleLeave"
          :class="[
            'cursor-pointer rounded-lg border p-3 transition-all',
            store.highlightedFeatureId === feature.id
              ? 'border-cyan-500 bg-cyan-900/30'
              : 'border-slate-700 bg-slate-900 hover:border-slate-500'
          ]"
        >
          <div class="flex items-center gap-2 mb-2">
            <span
              class="w-3 h-3 rounded-full flex-shrink-0"
              :style="{ backgroundColor: feature.color }"
            ></span>
            <span class="text-sm font-bold text-slate-200">{{ feature.name }}</span>
            <span
              :class="[
                'text-xs px-1.5 py-0.5 rounded ml-auto',
                feature.importance === 'high'
                  ? 'bg-red-900/50 text-red-400'
                  : feature.importance === 'medium'
                  ? 'bg-yellow-900/50 text-yellow-400'
                  : 'bg-slate-700 text-slate-400'
              ]"
            >
              {{ feature.importance === 'high' ? '高' : feature.importance === 'medium' ? '中' : '低' }}
            </span>
          </div>
          <p class="text-xs text-slate-400 mb-2">{{ feature.description }}</p>
          <div class="text-xs">
            <span class="text-slate-500">作用方向：</span>
            <span class="text-cyan-400">{{ feature.actionDirection }}</span>
          </div>
        </div>
      </div>

      <div class="pt-2 border-t border-slate-700">
        <h4 class="text-xs font-bold text-slate-500 mb-2">图例说明</h4>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-green-500"></span>
            <span class="text-slate-400">氢键供体</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span class="text-slate-400">氢键受体</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span class="text-slate-400">疏水基团</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-violet-500"></span>
            <span class="text-slate-400">芳香环</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span class="text-slate-400">正电中心</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-pink-500"></span>
            <span class="text-slate-400">负电中心</span>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="text-slate-500 text-sm">选择分子查看药效团</div>
  </div>
</template>

<script setup lang="ts">
import { useMoleculeStore } from '../store/molecule'

const store = useMoleculeStore()

function handleHover(id: string) {
  store.setHighlightedFeature(id)
}

function handleLeave() {
  store.setHighlightedFeature(null)
}
</script>
