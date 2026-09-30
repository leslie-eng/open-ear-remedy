const e={100:"starter",300:"standard",1e3:"value"};function n(r){const t=e[r];if(!t)throw new Error(`Unknown credit package: ${r} credits`);return t}export{n as p};
