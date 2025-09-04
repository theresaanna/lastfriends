// components/WordCloudLib.js
import * as d3 from 'd3';

export class WordCloudLib {
  constructor(svgElement, options = {}) {
    this.svg = d3.select(svgElement);
    this.width = options.width || 800;
    this.height = options.height || 400;
    this.colorScale = this.createColorScale();

    this.svg
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('viewBox', `0 0 ${this.width} ${this.height}`)
      .style('max-width', '100%')
      .style('height', 'auto');

    this.g = this.svg.append('g')
      .attr('transform', `translate(${this.width / 2}, ${this.height / 2})`);
  }

  createColorScale() {
    return d3.scaleSequential()
      .domain([0, 1])
      .interpolator((t) => {
        // Custom red gradient interpolator
        const colors = [
          '#ffebee', // lightest red
          '#ffcdd2',
          '#ef9a9a',
          '#e57373',
          '#ef5350',
          '#f44336',
          '#e53935',
          '#d32f2f',
          '#c62828',
          '#b71c1c'  // darkest red
        ];
        const index = Math.floor(t * (colors.length - 1));
        const remainder = t * (colors.length - 1) - index;

        if (index >= colors.length - 1) return colors[colors.length - 1];

        // Interpolate between colors
        return d3.interpolate(colors[index], colors[index + 1])(remainder);
      });
  }

  generateLayout(data) {
    if (!data || data.length === 0) return [];

    const maxValue = d3.max(data, d => d.value);
    const minValue = d3.min(data, d => d.value);

    // Sort by value for better layout
    const sortedData = [...data].sort((a, b) => b.value - a.value);

    return sortedData.map((d, i) => {
      const normalizedValue = maxValue > minValue
        ? (d.value - minValue) / (maxValue - minValue)
        : 0.5;

      // Font size scaling
      const fontSize = 14 + (normalizedValue * 28); // 14px to 42px

      // Spiral layout algorithm
      const angle = i * 0.3; // Tighter spiral
      const radius = Math.sqrt(i + 1) * 12; // Spread items more

      // Add some randomness to prevent perfect overlaps
      const randomOffsetX = (Math.random() - 0.5) * 20;
      const randomOffsetY = (Math.random() - 0.5) * 20;

      const x = Math.cos(angle) * radius + randomOffsetX;
      const y = Math.sin(angle) * radius + randomOffsetY;

      // Ensure items stay within bounds
      const boundedX = Math.max(-this.width/2 + fontSize, Math.min(this.width/2 - fontSize, x));
      const boundedY = Math.max(-this.height/2 + fontSize/2, Math.min(this.height/2 - fontSize/2, y));

      return {
        ...d,
        fontSize,
        x: boundedX,
        y: boundedY,
        normalizedValue,
        rotation: (Math.random() - 0.5) * 30 // Random rotation ±15 degrees
      };
    });
  }

  render(data) {
    if (!data || data.length === 0) {
      this.g.selectAll('*').remove();
      this.g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#6b7280')
        .style('font-size', '16px')
        .text('No data available');
      return this;
    }

    const layoutData = this.generateLayout(data);

    // Clear existing content
    this.g.selectAll('*').remove();

    // Create text elements
    const texts = this.g.selectAll('text')
      .data(layoutData)
      .enter()
      .append('text')
      .attr('class', 'wordcloud-text')
      .text(d => d.text)
      .attr('font-size', d => d.fontSize)
      .attr('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif')
      .attr('font-weight', d => d.normalizedValue > 0.6 ? 'bold' : d.normalizedValue > 0.3 ? '600' : 'normal')
      .attr('fill', d => this.colorScale(d.normalizedValue))
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('transform', d => `translate(${d.x}, ${d.y})`) // Removed rotation
      .style('opacity', 0)
      .style('cursor', 'pointer')
      .style('transition', 'all 0.2s ease');

    // Animate in with staggered delay
    texts.transition()
      .duration(600)
      .delay((d, i) => i * 30)
      .style('opacity', 1);

    // Add hover effects
    texts
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('font-size', d.fontSize * 1.1)
          .style('opacity', 0.8);
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('font-size', d.fontSize)
          .style('opacity', 1);
      })
      .on('click', function(event, d) {
        // Optional: Add click handler for future functionality
        console.log('Clicked:', d.text, d.value);
      });

    return this;
  }

  updateData(newData, transition = true) {
    if (!transition) {
      this.render(newData);
      return this;
    }

    // Fade out existing elements using specific selector
    this.g.selectAll('text.wordcloud-item')
      .transition()
      .duration(300)
      .style('opacity', 0)
      .remove()
      .end()
      .then(() => {
        // Render new data after fade out completes
        this.render(newData);
      })
      .catch(() => {
        // Fallback in case transition fails
        this.render(newData);
      });

    return this;
  }

  // Method to resize the word cloud
  resize(width, height) {
    this.width = width;
    this.height = height;

    this.svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    this.g.attr('transform', `translate(${width / 2}, ${height / 2})`);

    return this;
  }

  // Method to clear the word cloud
  clear() {
    this.g.selectAll('*').remove();
    return this;
  }
}