import Glyph from "./Glyph";

// Shared page header — icon tile + gradient title + subtitle, with an optional right-side slot
// (children) for actions or a stat. Gives every page a consistent, finished look.
export default function PageHeader({ icon, title, subtitle, children }) {
  return (
    <div className="ph">
      {icon && <div className="ph-ico"><Glyph name={icon} size={22} /></div>}
      <div className="ph-text">
        <h1 className="ph-title">{title}</h1>
        {subtitle && <p className="ph-sub">{subtitle}</p>}
      </div>
      {children && <div className="ph-actions">{children}</div>}
    </div>
  );
}
