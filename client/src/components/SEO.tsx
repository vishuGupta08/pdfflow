import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

const defaultSEO = {
  title: 'PDF Clinic - Professional PDF Transformation Tools | Edit, Convert, Merge PDFs Online',
  description: 'Transform your PDFs with 25+ professional tools. Merge, split, compress, add watermarks, convert to Word, and more. Fast, secure, and free PDF editor online.',
  keywords: 'PDF editor, PDF tools, merge PDF, split PDF, compress PDF, PDF to Word, PDF watermark, online PDF editor, PDF transformation',
  image: 'https://www.pdfclinic.org/og-image.jpg',
  url: 'https://www.pdfclinic.org/',
  type: 'website'
};

export const SEO = ({ 
  title = defaultSEO.title,
  description = defaultSEO.description,
  keywords = defaultSEO.keywords,
  image = defaultSEO.image,
  url = defaultSEO.url,
  type = defaultSEO.type
}: SEOProps) => {
  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      
      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={url} />
    </Helmet>
  );
};

// Predefined SEO configurations for different pages/states
export const SEOConfigs = {
  homepage: {
    title: 'PDF Clinic - Professional PDF Tools | Free Online PDF Editor',
    description: 'Transform your PDFs with 25+ professional tools. Merge, split, compress, add watermarks, convert to Word, and more. Fast, secure, and free PDF editor online.',
    keywords: 'PDF editor, PDF tools, merge PDF, split PDF, compress PDF, PDF to Word, PDF watermark, online PDF editor'
  },
  
  merge: {
    title: 'Merge PDF Files Online Free | PDF Clinic',
    description: 'Combine multiple PDF files into one document instantly. Drag & drop PDFs, rearrange pages, and merge files securely online with PDF Clinic.',
    keywords: 'merge PDF, combine PDF, join PDF files, PDF merger online, merge multiple PDFs'
  },
  
  split: {
    title: 'Split PDF Online Free | PDF Clinic',
    description: 'Split PDF documents by page ranges, individual pages, or page count. Extract specific pages from your PDF files quickly and easily.',
    keywords: 'split PDF, extract PDF pages, divide PDF, separate PDF pages, PDF splitter'
  },
  
  compress: {
    title: 'Compress PDF Online Free | Reduce PDF File Size | PDF Clinic',
    description: 'Reduce PDF file size while maintaining quality. Choose compression levels, optimize images, and compress PDFs up to 90% smaller.',
    keywords: 'compress PDF, reduce PDF size, PDF compressor, optimize PDF, shrink PDF file'
  },
  
  convert: {
    title: 'PDF to Word Converter Online Free | PDF Clinic',
    description: 'Convert PDF to Word documents with high accuracy. Maintain formatting, extract text, and edit PDFs as Word files.',
    keywords: 'PDF to Word, PDF converter, PDF to DOCX, convert PDF to Word, PDF to DOC'
  },
  
  watermark: {
    title: 'Add Watermark to PDF Online Free | PDF Clinic',
    description: 'Add text watermarks to your PDF documents. Customize position, opacity, and styling to protect and brand your PDFs.',
    keywords: 'PDF watermark, add watermark to PDF, watermark PDF online, PDF branding'
  },
  
  editor: {
    title: 'Online PDF Editor Free | Edit PDF Documents | PDF Clinic',
    description: 'Edit PDF documents online with our comprehensive PDF editor. Add text, images, annotations, highlights, and more.',
    keywords: 'PDF editor, edit PDF online, PDF annotation, add text to PDF, PDF markup'
  }
};

export default SEO;
