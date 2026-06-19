const PageHeader = ({ eyebrow, title, description, meta, actions }) => (
  <header className="page-header">
    <div className="page-header-copy">
      {eyebrow && <span className="page-header-eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {meta && <div className="page-header-meta">{meta}</div>}
    </div>

    {actions && <div className="page-header-actions">{actions}</div>}
  </header>
);

export default PageHeader;
