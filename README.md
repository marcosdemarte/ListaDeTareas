git add .
git commit -m "fix"
git push origin main
git tag
git tag -a v1.1.0 -m "new version"
git push origin --tags

npm uninstall github:marcosdemarte/ListaDeTareas
npm install github:marcosdemarte/ListaDeTareas
npm update @marcosdemarte/lista-de-tareas

import ListaDeTareas from "@marcosdemarte/lista-de-tareas";

<ListaDeTareas />

next.config.ts
transpilePackages: [
"@marcosdemarte/portafolio",
"@marcosdemarte/lista-de-tareas"
],
