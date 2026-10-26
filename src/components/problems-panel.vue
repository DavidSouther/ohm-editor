<template>
  <section
    v-if="problems.length > 0"
    id="problemsPanel"
    aria-labelledby="problemsHeading"
  >
    <h3 id="problemsHeading">
      Problems <span class="count">{{ problems.length }}</span>
    </h3>
    <ul aria-label="Problems">
      <li v-for="p in problems" :key="p.key">
        <button
          type="button"
          class="problem"
          :class="p.kind"
          :title="p.message"
          @click="select(p)"
        >
          <span class="where">{{ p.where }}</span>
          <span class="what">{{ p.expected }}</span>
          <span v-if="p.kind === 'final'" class="note">parse stopped</span>
          <span v-else-if="p.skipped" class="note"
            >skipped <code>{{ p.skipped }}</code></span
          >
        </button>
      </li>
    </ul>
  </section>
</template>

<script>
export {default} from './problems-panel.js';
</script>

<style>
#problemsPanel {
  border-bottom: 1px solid #ddd;
  flex: none;
  max-height: 30%;
  overflow: auto;
  padding: 6px 10px 8px 10px;
}
#problemsPanel h3 {
  color: #333;
  font-size: 10px;
  font-weight: normal;
  letter-spacing: 0.02em;
  margin: 2px 0 6px 0;
  text-transform: uppercase;
}
#problemsPanel h3 .count {
  background-color: var(--color-warning-1);
  border-radius: 8px;
  color: #333;
  display: inline-block;
  font-size: 10px;
  line-height: 14px;
  margin-left: 4px;
  min-width: 14px;
  padding: 0 4px;
  text-align: center;
}
#problemsPanel ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
#problemsPanel li + li {
  margin-top: 2px;
}
#problemsPanel .problem {
  align-items: baseline;
  background-color: transparent;
  border: 0;
  border-radius: 3px;
  color: #333;
  cursor: pointer;
  display: flex;
  font: inherit;
  font-size: 12px;
  gap: 10px;
  padding: 4px 6px;
  text-align: left;
  width: 100%;
}
#problemsPanel .problem:hover {
  background-color: #fff6db;
}
#problemsPanel .problem:focus-visible {
  outline: 2px solid rgb(53, 151, 255);
  outline-offset: -2px;
}
#problemsPanel .problem .where {
  color: #8a6100;
  flex: none;
  font-family: Menlo, Monaco, monospace;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  min-width: 3.5em;
}
#problemsPanel .problem .what {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
#problemsPanel .problem .note {
  color: var(--grey-text-color);
  flex: none;
  font-size: 11px;
}
#problemsPanel .problem .note code {
  background-color: rgba(255, 193, 7, 0.24);
  border-bottom: 1px dashed #c68a00;
  color: #333;
  font-family: Menlo, Monaco, monospace;
  padding: 0 2px;
}
#problemsPanel .problem.final .where,
#problemsPanel .problem.final .note {
  color: #c7254e;
}
#problemsPanel .problem.final:hover {
  background-color: #fbe3ea;
}
</style>
