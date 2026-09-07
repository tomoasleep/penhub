import type { SceneNode } from "@open-pencil/scene-graph";
import { summarizeNode } from "../lib/node-inspector";

interface Props {
  node: SceneNode | null;
}

export function NodeInspector({ node }: Props) {
  if (!node) {
    return (
      <div className="inspector inspector-empty">
        <div className="icon">🔍</div>
        <div className="title">node 未選択</div>
        <div className="desc">Viewer で node をクリックすると属性が表示されます</div>
      </div>
    );
  }

  const summary = summarizeNode(node);

  return (
    <div className="inspector">
      <div className="inspector-header">
        <span className="node-name">{summary.name}</span>
        <span className="node-type">{summary.type}</span>
      </div>
      <div className="inspector-body">
        {summary.sections.map((section) => (
          <div className="inspector-section" key={section.title}>
            <div className="section-title">{section.title}</div>
            {section.swatches && section.swatches.length > 0 && (
              <div className="swatch-list">
                {section.swatches.map((swatch, i) => (
                  <div className="swatch" key={i}>
                    <span className="chip" style={{ background: swatch.hex }} />
                    <span className="hex">{swatch.hex}</span>
                    <span className="extra">
                      {swatch.alpha !== 1 ? `${Math.round(swatch.alpha * 100)}%` : swatch.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {section.fields.map((field) => (
              <div className="field" key={field.label}>
                <span className="label">{field.label}</span>
                <span className="value">{field.value}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
