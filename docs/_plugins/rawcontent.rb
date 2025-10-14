module Jekyll
  class RawContent < Generator
    def generate(site)
      site.collections.each do |collection|
        collection.each do |label, docs|
          docs = [label] if label.is_a?(Jekyll::Document)
          next if docs.nil?

          docs.each do |doc|
            doc.data['raw_content'] = doc.content.dup
          end
        end
      end
    end
  end
end
