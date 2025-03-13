import semver from "semver"

async function getCompatibleVersions(packageName: string, versionRange: string) {
  // 获取所有版本
  const response = await fetch(`https://registry.npmjs.org/${packageName}`);
  const data = await response.json();
  const allVersions = Object.keys(data.versions);
  
  // 过滤符合范围的版本
  return allVersions.filter(version => semver.satisfies(version, versionRange));
}

// 使用示例
getCompatibleVersions('react', '>=18').then(versions => {
  console.log(`React 18.x 的所有版本:`, versions);
});