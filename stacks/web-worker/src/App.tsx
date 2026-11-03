/** 最初の状態。機能ができるまでは、本人限定の「準備中」だけが見える。 */
export default function App() {
  return (
    <main className="shell">
      <p className="eyebrow">新しいプロダクト</p>
      <h1>準備中です</h1>
      <p>いまは本人だけが開けます。機能ができたら、ここに表示されます。</p>
    </main>
  );
}
